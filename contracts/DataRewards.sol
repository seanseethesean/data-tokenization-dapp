// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDataToken {
    function mint(address to, uint256 amount) external;
}

/// @title DataRewards
/// @notice Converts verified unused data from billing records into reward tokens.
contract DataRewards is AccessControl, Pausable, ReentrancyGuard {
    // DESIGN PATTERN: RBAC / AccessControl for operational permissions.
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // DESIGN PATTERN: Two-step delayed admin changes for sensitive configuration
    uint256 public constant ADMIN_CHANGE_DELAY = 1 days;

    struct Conversion {
        uint256 id;
        address user;
        uint256 unusedMb;
        uint256 rewardAmount;
        string billingMonth;
        string dataURI; // proof / reference to where the unused data record came from
        uint256 timestamp;
    }

    IDataToken public dataToken;
    uint256 public nextConversionId;
    uint256 public mbPerToken;

    mapping(uint256 => Conversion) public conversions; // conversionId => Conversion
    mapping(bytes32 => bool) public processedMonths; // user+month => bool to guard against duplicate conversions for same user and billing month

    // Timelocked pending updates for reward token address and conversion rate to prevent instant admin changes without notice
    address public pendingRewardToken;
    uint256 public pendingRewardTokenExecuteAfter;
    uint256 public pendingMbPerToken;
    uint256 public pendingMbPerTokenExecuteAfter;

    event DataConverted(
        uint256 indexed conversionId,
        address indexed user,
        uint256 unusedMb,
        uint256 rewardAmount,
        string billingMonth,
        string dataURI
    );
    // indexed lets you filter events by these fields when querying logs
    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event ConversionRateUpdated(uint256 oldMbPerToken, uint256 newMbPerToken);
    event RewardTokenUpdateQueued(address indexed pendingToken, uint256 executeAfter);
    event ConversionRateUpdateQueued(uint256 pendingMbPerToken, uint256 executeAfter);

    constructor(address tokenAddress, address admin, uint256 _mbPerToken) {
        require(tokenAddress != address(0), "Invalid token address");
        require(admin != address(0), "Invalid admin");
        require(_mbPerToken > 0, "Invalid conversion rate");

        dataToken = IDataToken(tokenAddress);
        mbPerToken = _mbPerToken;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /// @notice Convert verified unused MB into reward tokens for one user and billing month.
    /// @dev Reward formula uses integer division and rounds down.
    function convertUnusedData(address user, uint256 unusedMb, string calldata billingMonth, string calldata dataURI) external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
        nonReentrant
    { // ReentrancyGuard, Pausable, Checks-Effects-Interactions 
        // Checks
        require(user != address(0), "Invalid user");
        require(unusedMb > 0, "Unused MB must be > 0");
        require(bytes(billingMonth).length > 0, "Billing month required");
        require(bytes(dataURI).length > 0, "Data URI required");
        require(_isValidBillingMonth(billingMonth), "Invalid billing month format");

        bytes32 recordKey = keccak256(abi.encodePacked(user, billingMonth)); // combine into a single key for tracking processed records
        require(!processedMonths[recordKey], "Month already processed for user"); // guard for duplicate conversions

        uint256 rewardAmount = unusedMb / mbPerToken; // integer division, rounds down, users only get rewards for whole tokens worth of MB to keep it simple and avoid fractional token issues
        require(rewardAmount > 0, "Reward must be > 0");

        // Effects
        processedMonths[recordKey] = true;

        conversions[nextConversionId] = Conversion({
            id: nextConversionId,
            user: user,
            unusedMb: unusedMb,
            rewardAmount: rewardAmount,
            billingMonth: billingMonth,
            dataURI: dataURI,
            timestamp: block.timestamp
        });

        // Interactions (external calls last)
        dataToken.mint(user, rewardAmount);

        emit DataConverted(nextConversionId, user, unusedMb, rewardAmount, billingMonth, dataURI);

        nextConversionId++;
    }

    /// @notice Queue reward token address update with a short safety delay
    function queueRewardTokenUpdate(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) { // assume you edit the datatoken contract, you deploy a new datatoken and call this function to update the address in this contract
        require(tokenAddress != address(0), "Invalid token address");

        pendingRewardToken = tokenAddress; // these are contract state variables
        pendingRewardTokenExecuteAfter = block.timestamp + ADMIN_CHANGE_DELAY;

        emit RewardTokenUpdateQueued(tokenAddress, pendingRewardTokenExecuteAfter);
    }

    /// @notice Apply previously queued reward token update.
    function applyRewardTokenUpdate() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(pendingRewardToken != address(0), "No pending token update");
        require(block.timestamp >= pendingRewardTokenExecuteAfter, "Token update still timelocked");

        address oldToken = address(dataToken);
        address newToken = pendingRewardToken;
        dataToken = IDataToken(newToken);

        pendingRewardToken = address(0);
        pendingRewardTokenExecuteAfter = 0;

        emit RewardTokenUpdated(oldToken, newToken);
    }

    /// @notice Queue MB-per-token conversion rate update with a short safety delay.
    function queueConversionRateUpdate(uint256 newMbPerToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMbPerToken > 0, "Invalid conversion rate");

        pendingMbPerToken = newMbPerToken;
        pendingMbPerTokenExecuteAfter = block.timestamp + ADMIN_CHANGE_DELAY;

        emit ConversionRateUpdateQueued(newMbPerToken, pendingMbPerTokenExecuteAfter);
    }

    /// @notice Apply previously queued conversion rate update.
    function applyConversionRateUpdate() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(pendingMbPerToken > 0, "No pending rate update");
        require(block.timestamp >= pendingMbPerTokenExecuteAfter, "Rate update still timelocked");

        uint256 oldMbPerToken = mbPerToken;
        uint256 newMbPerToken = pendingMbPerToken;
        mbPerToken = newMbPerToken;

        pendingMbPerToken = 0;
        pendingMbPerTokenExecuteAfter = 0;

        emit ConversionRateUpdated(oldMbPerToken, newMbPerToken);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getConversion(uint256 conversionId) external view returns (Conversion memory) { // returns a Conversion struct for a given conversionId
        return conversions[conversionId];
    }

    function _isValidBillingMonth(string calldata billingMonth) internal pure returns (bool) { // only "2026-01" format accepted for simplicity, no need for complex date parsing
        bytes calldata b = bytes(billingMonth);
        if (b.length != 7) {
            return false;
        }

        if (
            b[0] < 0x30 || b[0] > 0x39 ||
            b[1] < 0x30 || b[1] > 0x39 ||
            b[2] < 0x30 || b[2] > 0x39 ||
            b[3] < 0x30 || b[3] > 0x39
        ) {
            return false;
        }

        if (b[4] != 0x2d) {
            return false;
        }

        if (b[5] < 0x30 || b[5] > 0x39 || b[6] < 0x30 || b[6] > 0x39) {
            return false;
        }

        uint8 monthTens = uint8(b[5]) - 48;
        uint8 monthOnes = uint8(b[6]) - 48;
        uint8 monthValue = monthTens * 10 + monthOnes;
        return monthValue >= 1 && monthValue <= 12;
    }
}