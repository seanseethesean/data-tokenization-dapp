// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title VoucherRedemption
/// @notice Allows users to redeem predefined vouchers by paying DataToken to a treasury.
contract VoucherRedemption is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Voucher {
        uint256 id;
        string name;
        uint256 tokenCost;
        bool active;
    }

    IERC20 public dataToken;
    address public treasury;
    uint256 public nextVoucherId;

    mapping(uint256 => Voucher) public vouchers;

    event VoucherCreated(
        uint256 indexed voucherId,
        string name,
        uint256 tokenCost
    );

    event VoucherUpdated(
        uint256 indexed voucherId,
        string name,
        uint256 tokenCost,
        bool active
    );

    event VoucherRedeemed(
        uint256 indexed voucherId,
        address indexed user,
        uint256 tokenCost
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address tokenAddress, address treasuryAddress, address admin) {
        require(tokenAddress != address(0), "Invalid token address");
        require(treasuryAddress != address(0), "Invalid treasury address");
        require(admin != address(0), "Invalid admin");

        dataToken = IERC20(tokenAddress);
        treasury = treasuryAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    /// @notice Create a voucher users can redeem with tokens.
    function createVoucher(
        string calldata name,
        uint256 tokenCost
    ) external onlyRole(MANAGER_ROLE) {
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");

        vouchers[nextVoucherId] = Voucher({
            id: nextVoucherId,
            name: name,
            tokenCost: tokenCost,
            active: true
        });

        emit VoucherCreated(nextVoucherId, name, tokenCost);

        nextVoucherId++;
    }

    /// @notice Update voucher details or disable it.
    function updateVoucher(
        uint256 voucherId,
        string calldata name,
        uint256 tokenCost,
        bool active
    ) external onlyRole(MANAGER_ROLE) {
        Voucher storage voucher = vouchers[voucherId];
        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");

        voucher.name = name;
        voucher.tokenCost = tokenCost;
        voucher.active = active;

        emit VoucherUpdated(voucherId, name, tokenCost, active);
    }

    /// @notice Redeem an active voucher by transferring tokenCost from user to treasury.
    /// @dev User must approve this contract for at least tokenCost before redeeming.
    function redeemVoucher(uint256 voucherId) external {
        Voucher memory voucher = vouchers[voucherId];

        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(voucher.active, "Voucher inactive");

        bool success = dataToken.transferFrom(msg.sender, treasury, voucher.tokenCost);
        require(success, "Token transfer failed");

        emit VoucherRedeemed(voucherId, msg.sender, voucher.tokenCost);
    }

    /// @notice Update treasury that receives redeemed tokens.
    function setTreasury(address treasuryAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(treasuryAddress != address(0), "Invalid treasury address");

        address oldTreasury = treasury;
        treasury = treasuryAddress;

        emit TreasuryUpdated(oldTreasury, treasuryAddress);
    }

    function getVoucher(uint256 voucherId) external view returns (Voucher memory) {
        return vouchers[voucherId];
    }
}