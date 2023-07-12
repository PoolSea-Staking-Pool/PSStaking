pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../PoolseaBase.sol";
import "../../../interface/minipool/PoolseaMinipoolManagerInterface.sol";
import "../../../interface/old/PoolseaNetworkPricesInterfaceOld.sol";
import "../../../interface/old/PoolseaNodeStakingInterfaceOld.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsRewardsInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNodeInterface.sol";
import "../../../interface/PoolseaVaultInterface.sol";
import "../../../interface/util/AddressSetStorageInterface.sol";

// Handles node deposits and minipool creation

contract PoolseaNodeStakingOld is PoolseaBase, PoolseaNodeStakingInterfaceOld {

    // Libs
    using SafeMath for uint;

    // Events
    event RPLStaked(address indexed from, uint256 amount, uint256 time);
    event RPLWithdrawn(address indexed to, uint256 amount, uint256 time);
    event RPLSlashed(address indexed node, uint256 amount, uint256 ethValue, uint256 time);

    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 2;
    }

    // Get/set the total RPL stake amount
    function getTotalRPLStake() override external view returns (uint256) {
        return getUint(keccak256("rpl.staked.total.amount"));
    }
    function increaseTotalRPLStake(uint256 _amount) private {
        addUint(keccak256("rpl.staked.total.amount"), _amount);
    }
    function decreaseTotalRPLStake(uint256 _amount) private {
        subUint(keccak256("rpl.staked.total.amount"), _amount);
    }

    // Get/set a node's RPL stake amount
    function getNodeRPLStake(address _nodeAddress) override public view returns (uint256) {
        return getUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)));
    }
    function increaseNodeRPLStake(address _nodeAddress, uint256 _amount) private {
        addUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)), _amount);
    }
    function decreaseNodeRPLStake(address _nodeAddress, uint256 _amount) private {
        subUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)), _amount);
    }

    // Get/set the time a node last staked RPL at
    function getNodeRPLStakedTime(address _nodeAddress) override public view returns (uint256) {
        return getUint(keccak256(abi.encodePacked("rpl.staked.node.time", _nodeAddress)));
    }
    function setNodeRPLStakedTime(address _nodeAddress, uint256 _time) private {
        setUint(keccak256(abi.encodePacked("rpl.staked.node.time", _nodeAddress)), _time);
    }

    // Get the total effective RPL stake amount
    function getTotalEffectiveRPLStake() override external view returns (uint256) {
        // Load contracts
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        return poolseaNetworkPrices.getEffectiveRPLStake();
    }

    // Calculate total effective RPL stake, this features a potentially unbounded loop so can not be called on-chain
    // Instead, it is intended to be called by oracle nodes to be submitted alongside price updates
    function calculateTotalEffectiveRPLStake(uint256 offset, uint256 limit, uint256 rplPrice) override external view returns (uint256) {
        // Load contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Calculate current max RPL stake per minipool
        uint256 maxRplStakePerMinipool = poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
            .mul(poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake());
        // Loop all nodes and calculate their effective rate to sum
        AddressSetStorageInterface addressSetStorage = AddressSetStorageInterface(getContractAddress("addressSetStorage"));
        bytes32 key = keccak256("nodes.index");
        uint256 totalNodes = addressSetStorage.getCount(key);
        uint256 max = offset.add(limit);
        if (max > totalNodes || limit == 0) { max = totalNodes; }
        uint256 total = 0;
        for (uint i = offset; i < max; i++){
            // Get the node's address from the set
            address nodeAddress = addressSetStorage.getItem(key, i);
            // Get node's current RPL stake
            uint256 rplStake = getNodeRPLStake(nodeAddress);
            uint256 maxRplStake = maxRplStakePerMinipool.mul(poolseaMinipoolManager.getNodeStakingMinipoolCount(nodeAddress)).div(rplPrice);
            // Calculate node's maximum RPL stake
            if (rplStake < maxRplStake) { total = total.add(rplStake); }
            else { total = total.add(maxRplStake); }
        }
        return total;
    }

    // Get a node's effective RPL stake amount
    function getNodeEffectiveRPLStake(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Get node's current RPL stake
        uint256 rplStake = getNodeRPLStake(_nodeAddress);
        // Calculate node's maximum RPL stake
        uint256 maxRplStake = poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
            .mul(poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake())
            .mul(poolseaMinipoolManager.getNodeStakingMinipoolCount(_nodeAddress))
            .div(poolseaNetworkPrices.getRPLPrice());
        // Return effective stake amount
        if (rplStake < maxRplStake) { return rplStake; }
        else { return maxRplStake; }
    }

    // Get a node's minimum RPL stake to collateralize their minipools
    function getNodeMinimumRPLStake(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Calculate minimum RPL stake
        return poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
            .mul(poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake())
            .mul(poolseaMinipoolManager.getNodeActiveMinipoolCount(_nodeAddress))
            .div(poolseaNetworkPrices.getRPLPrice());
    }

    // Get a node's maximum RPL stake to fully collateralize their minipools
    function getNodeMaximumRPLStake(address _nodeAddress) override public view returns (uint256) {
        // Load contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Calculate maximum RPL stake
        return poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
            .mul(poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake())
            .mul(poolseaMinipoolManager.getNodeActiveMinipoolCount(_nodeAddress))
            .div(poolseaNetworkPrices.getRPLPrice());
    }

    // Get a node's minipool limit based on RPL stake
    function getNodeMinipoolLimit(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Calculate & return minipool limit
        return getNodeRPLStake(_nodeAddress)
            .mul(poolseaNetworkPrices.getRPLPrice())
            .div(
            poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
                .mul(poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake())
            );
    }

    // Accept an RPL stake
    // Only accepts calls from registered nodes
    function stakeRPL(uint256 _amount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(msg.sender) {
        _stakeRPL(msg.sender, _amount);
    }

    // Accept an RPL stake from any address for a specified node
    function stakeRPLFor(address _nodeAddress, uint256 _amount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(_nodeAddress) {
        _stakeRPL(_nodeAddress, _amount);
    }

    function _stakeRPL(address _nodeAddress, uint256 _amount) internal {
        // Load contracts
        address rplTokenAddress = getContractAddress("poolseaTokenRPL");
        address poolseaVaultAddress = getContractAddress("poolseaVault");
        IERC20 rplToken = IERC20(rplTokenAddress);
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(poolseaVaultAddress);
        // Transfer RPL tokens
        require(rplToken.transferFrom(msg.sender, address(this), _amount), "Could not transfer RPL to staking contract");
        // Deposit RPL tokens to vault
        require(rplToken.approve(poolseaVaultAddress, _amount), "Could not approve vault RPL deposit");
        poolseaVault.depositToken("poolseaNodeStaking", rplToken, _amount);
        // Get node's current stake
        uint256 rplStake = getNodeRPLStake(_nodeAddress);
        // Update RPL stake amounts & node RPL staked block
        increaseTotalRPLStake(_amount);
        increaseNodeRPLStake(_nodeAddress, _amount);
        updateTotalEffectiveRPLStake(_nodeAddress, rplStake, rplStake.add(_amount));
        setNodeRPLStakedTime(_nodeAddress, block.timestamp);
        // Emit RPL staked event
        emit RPLStaked(_nodeAddress, _amount, block.timestamp);
    }

    // Withdraw staked RPL back to the node account
    // Only accepts calls from registered nodes
    function withdrawRPL(uint256 _amount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(msg.sender) {
        // Load contracts
        PoolseaDAOProtocolSettingsRewardsInterface poolseaDAOProtocolSettingsRewards = PoolseaDAOProtocolSettingsRewardsInterface(getContractAddress("poolseaDAOProtocolSettingsRewards"));
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        // Check cooldown period (one claim period) has passed since RPL last staked
        require(block.timestamp.sub(getNodeRPLStakedTime(msg.sender)) >= poolseaDAOProtocolSettingsRewards.getRewardsClaimIntervalTime(), "The withdrawal cooldown period has not passed");
        // Get & check node's current RPL stake
        uint256 rplStake = getNodeRPLStake(msg.sender);
        require(rplStake >= _amount, "Withdrawal amount exceeds node's staked RPL balance");
        // Check withdrawal would not undercollateralize node
        require(rplStake.sub(_amount) >= getNodeMaximumRPLStake(msg.sender), "Node's staked RPL balance after withdrawal is less than required balance");
        // Update RPL stake amounts
        decreaseTotalRPLStake(_amount);
        decreaseNodeRPLStake(msg.sender, _amount);
        updateTotalEffectiveRPLStake(msg.sender, rplStake, rplStake.sub(_amount));
        // Transfer RPL tokens to node address
        poolseaVault.withdrawToken(poolseaStorage.getNodeWithdrawalAddress(msg.sender), IERC20(getContractAddress("poolseaTokenRPL")), _amount);
        // Emit RPL withdrawn event
        emit RPLWithdrawn(msg.sender, _amount, block.timestamp);
    }

    // Updates the stored total effective rate based on a node's changing staking balance
    function updateTotalEffectiveRPLStake(address _nodeAddress, uint256 _oldStake, uint256 _newStake) private {
        // Load contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Require price consensus
        require(poolseaNetworkPrices.inConsensus(), "Network is not in consensus");
        // Get the node's maximum possible stake
        uint256 maxRplStake = poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount()
            .mul(poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake())
            .mul(poolseaMinipoolManager.getNodeStakingMinipoolCount(_nodeAddress))
            .div(poolseaNetworkPrices.getRPLPrice());
        // Easy out if total stake isn't changing
        if (_oldStake >= maxRplStake && _newStake >= maxRplStake) {
            return;
        }
        // Check if we have to decrease total
        if (_oldStake > _newStake) {
            uint256 decrease = _oldStake.sub(_newStake);
            uint256 delta = maxRplStake.sub(_newStake);
            if (decrease < delta) { delta = decrease; }
            poolseaNetworkPrices.decreaseEffectiveRPLStake(delta);
            return;
        }
        // Check if we have to increase total
        if (_newStake > _oldStake) {
            uint256 increase = _newStake.sub(_oldStake);
            uint256 delta = maxRplStake.sub(_oldStake);
            if (delta > increase) { delta = increase; }
            poolseaNetworkPrices.increaseEffectiveRPLStake(delta);
        }
        // _oldStake == _newStake (do nothing but shouldn't happen)
    }

    // Slash a node's RPL by an ETH amount
    // Only accepts calls from registered minipools
    function slashRPL(address _nodeAddress, uint256 _ethSlashAmount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredMinipool(msg.sender) {
        // Load contracts
        PoolseaNetworkPricesInterfaceOld poolseaNetworkPrices = PoolseaNetworkPricesInterfaceOld(getContractAddress("poolseaNetworkPrices"));
        PoolseaVaultInterface poolseaVault = PoolseaVaultInterface(getContractAddress("poolseaVault"));
        // Calculate RPL amount to slash
        uint256 rplSlashAmount = calcBase.mul(_ethSlashAmount).div(poolseaNetworkPrices.getRPLPrice());
        // Cap slashed amount to node's RPL stake
        uint256 rplStake = getNodeRPLStake(_nodeAddress);
        if (rplSlashAmount > rplStake) { rplSlashAmount = rplStake; }
        // Transfer slashed amount to auction contract
        if(rplSlashAmount > 0) poolseaVault.transferToken("poolseaAuctionManager", IERC20(getContractAddress("poolseaTokenRPL")), rplSlashAmount);
        // Update RPL stake amounts
        decreaseTotalRPLStake(rplSlashAmount);
        decreaseNodeRPLStake(_nodeAddress, rplSlashAmount);
        updateTotalEffectiveRPLStake(_nodeAddress, rplStake, rplStake.sub(rplSlashAmount));
        // Emit RPL slashed event
        emit RPLSlashed(_nodeAddress, rplSlashAmount, _ethSlashAmount, block.timestamp);
    }

}
