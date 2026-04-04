// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IDataTokenBurnable {
    function burnFrom(address account, uint256 value) external;
}

/// @title VoucherRedemption
/// @notice Allows users to redeem predefined vouchers by burning DataToken.
contract VoucherRedemption is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Voucher {
        uint256 id;
        string name;
        uint256 tokenCost;
        uint256 remaining;
        bool active;
    }

    IDataTokenBurnable public dataToken;
    uint256 public nextVoucherId;

    mapping(uint256 => Voucher) public vouchers;

    event VoucherCreated(
        uint256 indexed voucherId,
        string name,
        uint256 tokenCost,
        uint256 remaining
    );

    event VoucherUpdated(
        uint256 indexed voucherId,
        string name,
        uint256 tokenCost,
        uint256 remaining,
        bool active
    );

    event VoucherRedeemed(
        uint256 indexed voucherId,
        address indexed user,
        uint256 tokenCost
    );

    constructor(address tokenAddress, address admin) {
        require(tokenAddress != address(0), "Invalid token address");
        require(admin != address(0), "Invalid admin");

        dataToken = IDataTokenBurnable(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    /// @notice Create a voucher users can redeem with tokens.
    function createVoucher(
        string calldata name,
        uint256 tokenCost,
        uint256 remaining
    ) external onlyRole(MANAGER_ROLE) {
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");
        require(remaining > 0, "Remaining must be > 0");

        vouchers[nextVoucherId] = Voucher({
            id: nextVoucherId,
            name: name,
            tokenCost: tokenCost,
            remaining: remaining,
            active: true
        });

        emit VoucherCreated(nextVoucherId, name, tokenCost, remaining);

        nextVoucherId++;
    }

    /// @notice Update voucher details or disable it.
    function updateVoucher(
        uint256 voucherId,
        string calldata name,
        uint256 tokenCost,
        uint256 remaining,
        bool active
    ) external onlyRole(MANAGER_ROLE) {
        Voucher storage voucher = vouchers[voucherId];
        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");
        require(remaining > 0, "Remaining must be > 0");

        voucher.name = name;
        voucher.tokenCost = tokenCost;
        voucher.remaining = remaining;
        voucher.active = active;

        emit VoucherUpdated(voucherId, name, tokenCost, remaining, active);
    }

    /// @notice Redeem an active voucher by burning tokenCost from caller.
    /// @dev Caller must approve this contract for at least tokenCost before redeeming.
    function redeemVoucher(uint256 voucherId) external {
        Voucher storage voucher = vouchers[voucherId];

        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(voucher.active, "Voucher inactive");
        require(voucher.remaining > 0, "Voucher out of stock");

        voucher.remaining -= 1;
        if (voucher.remaining == 0) {
            voucher.active = false;
        }

        dataToken.burnFrom(msg.sender, voucher.tokenCost);

        emit VoucherRedeemed(voucherId, msg.sender, voucher.tokenCost);
    }

    function getVoucher(uint256 voucherId) external view returns (Voucher memory) {
        return vouchers[voucherId];
    }
}