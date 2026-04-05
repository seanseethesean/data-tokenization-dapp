// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./VoucherToken.sol";

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
        uint256 maxPerUser;
        bool active;
    }

    IDataTokenBurnable public dataToken;
    VoucherToken public voucherToken;
    uint256 public nextVoucherId;

    mapping(uint256 => Voucher) public vouchers;
    mapping(uint256 => mapping(address => uint256)) public redeemedCount;

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
        uint256 amount
    );

    event VoucherUsed(
        uint256 indexed voucherId,
        address indexed user,
        address indexed operator,
        uint256 timestamp
    );

    constructor(address dataTokenAddress, address voucherTokenAddress, address admin) {
        require(dataTokenAddress != address(0), "Invalid token address");
        require(voucherTokenAddress != address(0), "Invalid voucher token address");
        require(admin != address(0), "Invalid admin");

        dataToken = IDataTokenBurnable(dataTokenAddress);
        voucherToken = VoucherToken(voucherTokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    /// @notice Create a voucher users can redeem with tokens.
    function createVoucher(
        string calldata name,
        uint256 tokenCost,
        uint256 remaining,
        uint256 maxPerUser
    ) external onlyRole(MANAGER_ROLE) {
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");
        require(remaining > 0, "Remaining must be > 0");
        require(maxPerUser > 0, "maxPerUser must be > 0");

        vouchers[nextVoucherId] = Voucher({
            id: nextVoucherId,
            name: name,
            tokenCost: tokenCost,
            remaining: remaining,
            maxPerUser: maxPerUser,
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
        require(
            redeemedCount[voucherId][msg.sender] < voucher.maxPerUser,
            "User redemption limit reached"
        );

        dataToken.burnFrom(msg.sender, voucher.tokenCost);
        voucherToken.mint(msg.sender, voucherId, 1);

        voucher.remaining -= 1;
        redeemedCount[voucherId][msg.sender] += 1;
        if (voucher.remaining == 0) {
            voucher.active = false;
        }

        emit VoucherRedeemed(voucherId, msg.sender, 1);
    }

    function useVoucher(address user, uint256 voucherId) external onlyRole(MANAGER_ROLE) {
        require(user != address(0), "Invalid user");
        require(voucherToken.balanceOf(user, voucherId) > 0, "User has no voucher");

        voucherToken.burn(user, voucherId, 1);

        emit VoucherUsed(voucherId, user, msg.sender, block.timestamp);
    }

    function getVoucher(uint256 voucherId) external view returns (Voucher memory) {
        return vouchers[voucherId];
    }
}