// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title VoucherToken
/// @notice ERC1155 voucher token where each voucher campaign maps to one token ID.
contract VoucherToken is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Sets base metadata URI and assigns initial admin role.
    /// @dev Admin can grant MINTER_ROLE and BURNER_ROLE after deployment.
    constructor(string memory baseUri, address admin) ERC1155(baseUri) { // allows each voucher ID to map to off-chain metadata such as voucher description, merchant details, and expiry. This improves UI display while keeping the on-chain contract lightweight.
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // define our own mint and burn functions with role restrictions, ERC1155 doesn't have built-in access control
    /// @notice Mints voucher units for a specific campaign ID to a recipient.
    /// @dev Restricted to MINTER_ROLE so only trusted contracts/accounts can issue vouchers.
    function mint(address to, uint256 id, uint256 amount) external onlyRole(MINTER_ROLE) { // external so function can be called outside contract by VoucherRedemption when user redeems a voucher
        _mint(to, id, amount, "");
    }

    /// @notice Burns voucher units from a holder for a specific campaign ID.
    /// @dev Restricted to BURNER_ROLE to prevent arbitrary destruction of user vouchers.
    function burn(address from, uint256 id, uint256 amount) external onlyRole(BURNER_ROLE) { // so only burner role can burn vouchers, not open to public to prevent abuse
        _burn(from, id, amount);
    }

    /// @notice Reports interface support from both ERC1155 and AccessControl parents.
    /// @dev Required override due to multiple inheritance.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
