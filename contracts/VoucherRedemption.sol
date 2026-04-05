// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VoucherToken.sol";

interface IDataTokenBurnable { // separate interface to avoid importing full DataToken 
    function burnFrom(address account, uint256 value) external;
}

/// @title VoucherRedemption
/// @notice Allows users to redeem predefined vouchers by burning DataToken
contract VoucherRedemption is AccessControl, Pausable, ReentrancyGuard {
    // DESIGN PATTERN: RBAC
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Voucher { // represents a voucher campaign, each with its own token ID in VoucherToken
        uint256 id;
        string name;
        uint256 tokenCost;
        uint256 remaining;
        uint256 maxPerUser; // to prevent abuse where one user redeems all vouchers, set a max redemption limit per user for each voucher campaign
        bool active;
        address merchant;
    }

    IDataTokenBurnable public dataToken; // initialised in constructor
    VoucherToken public voucherToken; // initialised in constructor
    uint256 public nextVoucherId; // initialised to 0 by default, auto-incremented for each new voucher

    mapping(uint256 => Voucher) public vouchers; // voucherId => Voucher
    mapping(uint256 => mapping(address => uint256)) public redeemedCount; // voucherId => user => count redeemed, for tracking how many times each user has redeemed each voucher to enforce maxPerUser limit

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
        uint256 maxPerUser, // maximum number of times each user can redeem this specific voucher
        address merchant
    ) external onlyRole(MANAGER_ROLE) whenNotPaused {
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");
        require(remaining > 0, "Remaining must be > 0");
        require(maxPerUser > 0, "maxPerUser must be > 0");
        require(merchant != address(0), "Merchant required");

        vouchers[nextVoucherId] = Voucher({
            id: nextVoucherId,
            name: name,
            tokenCost: tokenCost,
            remaining: remaining,
            maxPerUser: maxPerUser,
            active: true,
            merchant: merchant
        });

        emit VoucherCreated(nextVoucherId, name, tokenCost, remaining);

        nextVoucherId++;
    }

    /// @notice Update voucher details or disable it.
    function updateVoucher(
        uint256 voucherId,
        string calldata name, // only reads name e.g. "10% off coffee"
        uint256 tokenCost,
        uint256 remaining,
        uint256 maxPerUser,
        bool active
    ) external onlyRole(MANAGER_ROLE) whenNotPaused { // PATTERN: RBAC for manager role, Pausable for emergency stop
        Voucher storage voucher = vouchers[voucherId];
        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(bytes(name).length > 0, "Voucher name required");
        require(tokenCost > 0, "Token cost must be > 0");
        require(maxPerUser > 0, "maxPerUser must be > 0");

        voucher.name = name;
        voucher.tokenCost = tokenCost;
        voucher.remaining = remaining;
        voucher.maxPerUser = maxPerUser;
        voucher.active = remaining == 0 ? false : active;

        emit VoucherUpdated(voucherId, name, tokenCost, remaining, voucher.active);
    }

    /// @notice Redeem an active voucher by burning tokenCost from caller
    /// @dev Caller must approve this contract for at least tokenCost before redeeming
    function redeemVoucher(uint256 voucherId) external whenNotPaused nonReentrant { // ReentrancyGuard, Pausable for emergency stop
        // DESIGN PATTERN: Checks-Effects-Interactions ordering to reduce risk around external calls
        Voucher storage voucher = vouchers[voucherId];
        // Checks
        require(bytes(voucher.name).length > 0, "Voucher not found");
        require(voucher.active, "Voucher inactive");
        require(voucher.remaining > 0, "Voucher out of stock");
        require(
            redeemedCount[voucherId][msg.sender] < voucher.maxPerUser, // enforce max redemption limit per user to prevent abuse where one user redeems all vouchers
            "User redemption limit reached"
        );

        // Effects
        voucher.remaining -= 1;
        redeemedCount[voucherId][msg.sender] += 1;
        if (voucher.remaining == 0) {
            voucher.active = false;
        }

        // Interactions (external calls last)
        dataToken.burnFrom(msg.sender, voucher.tokenCost); // customer is the caller
        voucherToken.mint(msg.sender, voucherId, 1);

        emit VoucherRedeemed(voucherId, msg.sender, 1);
    }

    function useVoucher(address user, uint256 voucherId) external whenNotPaused nonReentrant {
        Voucher storage voucher = vouchers[voucherId];

        require(bytes(voucher.name).length > 0, "Voucher not found");
        // RBAC to restrict this function to only the merchant associated with the voucher 
        require(msg.sender == voucher.merchant, "Not authorized merchant");
        require(user != address(0), "Invalid user");
        require(voucherToken.balanceOf(user, voucherId) > 0, "User has no voucher");

        voucherToken.burn(user, voucherId, 1);

        emit VoucherUsed(voucherId, user, msg.sender, block.timestamp);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { // only admin can pause/unpause for emergency stop
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getVoucher(uint256 voucherId) external view returns (Voucher memory) {
        return vouchers[voucherId];
    }
}