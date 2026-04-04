// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IDataToken {
    function mint(address to, uint256 amount) external;
}

/// @title DataRewards
/// @notice Converts verified unused data from billing records into reward tokens.
contract DataRewards is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Conversion {
        uint256 id;
        address user;
        uint256 unusedMb;
        uint256 rewardAmount;
        string billingMonth;
        string dataURI;
        uint256 timestamp;
    }

    IDataToken public dataToken;
    uint256 public nextConversionId;
    uint256 public mbPerToken;

    mapping(uint256 => Conversion) public conversions;
    mapping(bytes32 => bool) public processedMonths;

    event DataConverted(
        uint256 indexed conversionId,
        address indexed user,
        uint256 unusedMb,
        uint256 rewardAmount,
        string billingMonth,
        string dataURI
    );

    event RewardTokenUpdated(address indexed oldToken, address indexed newToken);
    event ConversionRateUpdated(uint256 oldMbPerToken, uint256 newMbPerToken);

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
    function convertUnusedData(
        address user,
        uint256 unusedMb,
        string calldata billingMonth,
        string calldata dataURI
    ) external onlyRole(OPERATOR_ROLE) { // Guarded to operators who verify data and trigger conversion, not open to public to prevent abuse
        require(user != address(0), "Invalid user");
        require(unusedMb > 0, "Unused MB must be > 0");
        require(bytes(billingMonth).length > 0, "Billing month required");
        require(bytes(dataURI).length > 0, "Data URI required");

        bytes32 recordKey = keccak256(abi.encodePacked(user, billingMonth));
        require(!processedMonths[recordKey], "Month already processed for user"); // guard for duplicate conversions

        uint256 rewardAmount = unusedMb / mbPerToken;
        require(rewardAmount > 0, "Reward must be > 0");

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

        dataToken.mint(user, rewardAmount);

        emit DataConverted(nextConversionId, user, unusedMb, rewardAmount, billingMonth, dataURI);

        nextConversionId++;
    }

    /// @notice Update reward token address in case token contract is redeployed.
    function setRewardToken(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(0), "Invalid token address");

        address oldToken = address(dataToken);
        dataToken = IDataToken(tokenAddress);

        emit RewardTokenUpdated(oldToken, tokenAddress);
    }

    /// @notice Update MB-per-token conversion rate.
    function setConversionRate(uint256 newMbPerToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMbPerToken > 0, "Invalid conversion rate");

        uint256 oldMbPerToken = mbPerToken;
        mbPerToken = newMbPerToken;

        emit ConversionRateUpdated(oldMbPerToken, newMbPerToken);
    }

    function getConversion(uint256 conversionId) external view returns (Conversion memory) {
        return conversions[conversionId];
    }
}