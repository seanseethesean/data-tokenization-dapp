// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice ERC20 token used for rewarding approved data submissions and voucher redemption.
contract DataToken is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event TokensMinted(address indexed to, uint256 amount, address indexed minter);

    /// @notice Initializes token metadata and grants admin/minter roles.
    /// @dev Admin receives both DEFAULT_ADMIN_ROLE and MINTER_ROLE.
    constructor (address admin) ERC20("DataToken", "DTT") {
        require(admin != address(0), "Invalid admin"); // ensure admin is not zero address

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /// @notice Returns token decimals used for display and accounting.
    /// @dev Fixed to 0 so balances and transfers are whole-number units.
    function decimals() public view override returns (uint8) { // Override to set decimals to 0 for whole token units for simplicity
        return 0;
    }   

    /// @notice Mint tokens to a recipient.
    /// @dev Caller must have MINTER_ROLE; validates recipient and amount before minting.
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }
}