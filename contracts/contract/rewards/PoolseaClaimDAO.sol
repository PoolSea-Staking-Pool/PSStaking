pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "../PoolseaBase.sol";
import "../../interface/PoolseaVaultInterface.sol";
import "../../interface/rewards/PoolseaRewardsPoolInterface.sol";
import "../../interface/rewards/claims/PoolseaClaimDAOInterface.sol";


// RPL Rewards claiming by the DAO
contract PoolseaClaimDAO is PoolseaBase, PoolseaClaimDAOInterface {

    // Events
    event RPLTokensSentByDAOProtocol(string invoiceID, address indexed from, address indexed to, uint256 amount, uint256 time);

    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        // Version
        version = 2;
    }

    // Spend the network DAOs RPL rewards
    function spend(string memory _invoiceID, address _recipientAddress, uint256 _amount) override external onlyLatestContract("poolseaDAOProtocolProposals", msg.sender) {
        // Load contracts
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        // Addresses
        IERC20 rplToken = IERC20(getContractAddress("poolseaTokenRPL"));
        // Some initial checks
        require(_amount > 0 && _amount <= poolseaVault.balanceOfToken("poolseaClaimDAO", rplToken), "You cannot send 0 RPL or more than the DAO has in its account");
        // Send now
        poolseaVault.withdrawToken(_recipientAddress, rplToken, _amount);
        // Log it
        emit RPLTokensSentByDAOProtocol(_invoiceID, address(this), _recipientAddress, _amount, block.timestamp);
    }


}
