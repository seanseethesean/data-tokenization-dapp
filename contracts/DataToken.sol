// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice ERC20 token used for rewarding approved data submissions and voucher redemption.
contract DataToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event TokensMinted(address indexed to, uint256 amount, address indexed minter);

    constructor (address admin) ERC20("DataToken", "DTT") {
        require(admin != address(0), "Invalid admin"); // ensure admin is not zero address

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    function decimals() public view override returns (uint8) { // Override to set decimals to 0 for whole token units for simplicity
        return 0;
    }   

    /// @notice Mint tokens to a recipient.
    /// @dev Caller must have MINTER_ROLE.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }
}