// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../PoolseaBase.sol";
import "../../interface/minipool/PoolseaMinipoolManagerInterface.sol";
import "../../interface/network/PoolseaNetworkPricesInterface.sol";
import "../../interface/node/PoolseaNodeStakingInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsRewardsInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsMinipoolInterface.sol";
import "../../interface/dao/protocol/settings/PoolseaDAOProtocolSettingsNodeInterface.sol";
import "../../interface/PoolseaVaultInterface.sol";
import "../../interface/util/AddressSetStorageInterface.sol";

/// @notice Handles node deposits and minipool creation
contract PoolseaNodeStaking is PoolseaBase, PoolseaNodeStakingInterface {

    // Libs
    using SafeMath for uint;

    // Events
    event RPLStaked(address indexed from, uint256 amount, uint256 time);
    event RPLWithdrawn(address indexed to, uint256 amount, uint256 time);
    event RPLSlashed(address indexed node, uint256 amount, uint256 ethValue, uint256 time);
    event StakeRPLForAllowed(address indexed node, address indexed caller, bool allowed, uint256 time);

    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        version = 4;
    }

    /// @notice Returns the total quantity of RPL staked on the network
    function getTotalRPLStake() override external view returns (uint256) {
        return getUint(keccak256("rpl.staked.total.amount"));
    }

    /// @dev Increases the total network RPL stake
    /// @param _amount How much to increase by
    function increaseTotalRPLStake(uint256 _amount) private {
        addUint(keccak256("rpl.staked.total.amount"), _amount);
    }

    /// @dev Decrease the total network RPL stake
    /// @param _amount How much to decrease by
    function decreaseTotalRPLStake(uint256 _amount) private {
        subUint(keccak256("rpl.staked.total.amount"), _amount);
    }

    /// @notice Returns the amount a given node operator has staked
    /// @param _nodeAddress The address of the node operator to query
    function getNodeRPLStake(address _nodeAddress) override public view returns (uint256) {
        return getUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)));
    }

    /// @dev Increases a node operator's RPL stake
    /// @param _amount How much to increase by
    function increaseNodeRPLStake(address _nodeAddress, uint256 _amount) private {
        addUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)), _amount);
    }

    /// @dev Decrease a node operator's RPL stake
    /// @param _amount How much to decrease by
    function decreaseNodeRPLStake(address _nodeAddress, uint256 _amount) private {
        subUint(keccak256(abi.encodePacked("rpl.staked.node.amount", _nodeAddress)), _amount);
    }

    /// @notice Returns a node's matched ETH amount (amount taken from protocol to stake)
    /// @param _nodeAddress The address of the node operator to query
    function getNodeETHMatched(address _nodeAddress) override public view returns (uint256) {
        uint256 ethMatched = getUint(keccak256(abi.encodePacked("eth.matched.node.amount", _nodeAddress)));

        if (ethMatched > 0) {
            return ethMatched;
        } else {
            // Fallback for backwards compatibility before ETH matched was recorded (all minipools matched 16 ETH from protocol)
            PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
            return poolseaMinipoolManager.getNodeActiveMinipoolCount(_nodeAddress).mul(16 ether);
        }
    }

    /// @notice Returns a node's provided ETH amount (amount supplied to create minipools)
    /// @param _nodeAddress The address of the node operator to query
    function getNodeETHProvided(address _nodeAddress) override public view returns (uint256) {
        // Get contracts
        PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
        uint256 activeMinipoolCount = poolseaMinipoolManager.getNodeActiveMinipoolCount(_nodeAddress);
        // Retrieve stored ETH matched value
        uint256 ethMatched = getUint(keccak256(abi.encodePacked("eth.matched.node.amount", _nodeAddress)));
        if (ethMatched > 0) {
            PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
            uint256 launchAmount = poolseaDAOProtocolSettingsMinipool.getLaunchBalance();
            // ETH provided is number of staking minipools * 32 - eth matched
            uint256 totalEthStaked = activeMinipoolCount.mul(launchAmount);
            return totalEthStaked.sub(ethMatched);
        } else {
            // Fallback for legacy minipools is number of staking minipools * 16
            return activeMinipoolCount.mul(16 ether);
        }
    }

    /// @notice Returns the ratio between capital taken from users and provided by a node operator.
    ///         The value is a 1e18 precision fixed point integer value of (node capital + user capital) / node capital.
    /// @param _nodeAddress The address of the node operator to query
    function getNodeETHCollateralisationRatio(address _nodeAddress) override public view returns (uint256) {
        uint256 ethMatched = getUint(keccak256(abi.encodePacked("eth.matched.node.amount", _nodeAddress)));
        if (ethMatched == 0) {
            // Node operator only has legacy minipools and all legacy minipools had a 1:1 ratio
            return calcBase.mul(2);
        } else {
            PoolseaDAOProtocolSettingsMinipoolInterface poolseaDAOProtocolSettingsMinipool = PoolseaDAOProtocolSettingsMinipoolInterface(getContractAddress("poolseaDAOProtocolSettingsMinipool"));
            uint256 launchAmount = poolseaDAOProtocolSettingsMinipool.getLaunchBalance();
            PoolseaMinipoolManagerInterface poolseaMinipoolManager = PoolseaMinipoolManagerInterface(getContractAddress("poolseaMinipoolManager"));
            uint256 totalEthStaked = poolseaMinipoolManager.getNodeActiveMinipoolCount(_nodeAddress).mul(launchAmount);
            return totalEthStaked.mul(calcBase).div(totalEthStaked.sub(ethMatched));
        }
    }

    /// @notice Returns the timestamp at which a node last staked RPL
    function getNodeRPLStakedTime(address _nodeAddress) override public view returns (uint256) {
        return getUint(keccak256(abi.encodePacked("rpl.staked.node.time", _nodeAddress)));
    }

    /// @dev Sets the timestamp at which a node last staked RPL
    /// @param _nodeAddress The address of the node operator to set the value for
    /// @param _time The timestamp to set
    function setNodeRPLStakedTime(address _nodeAddress, uint256 _time) private {
        setUint(keccak256(abi.encodePacked("rpl.staked.node.time", _nodeAddress)), _time);
    }

    /// @notice Calculate and return a node's effective RPL stake amount
    /// @param _nodeAddress The address of the node operator to calculate for
    function getNodeEffectiveRPLStake(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaNetworkPricesInterface poolseaNetworkPrices = PoolseaNetworkPricesInterface(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Get node's current RPL stake
        uint256 rplStake = getNodeRPLStake(_nodeAddress);
        // Retrieve variables for calculations
        uint256 matchedETH = getNodeETHMatched(_nodeAddress);
        uint256 providedETH = getNodeETHProvided(_nodeAddress);
        uint256 rplPrice = poolseaNetworkPrices.getRPLPrice();
        // RPL stake cannot exceed maximum
        uint256 maximumStakePercent = poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake();
        uint256 maximumStake = providedETH.mul(maximumStakePercent).div(rplPrice);
        if (rplStake > maximumStake) {
            return maximumStake;
        }
        // If RPL stake is lower than minimum, node has no effective stake
        uint256 minimumStakePercent = poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake();
        uint256 minimumStake = matchedETH.mul(minimumStakePercent).div(rplPrice);
        if (rplStake < minimumStake) {
            return 0;
        }
        // Otherwise, return the actual stake
        return rplStake;
    }

    /// @notice Calculate and return a node's minimum RPL stake to collateralize their minipools
    /// @param _nodeAddress The address of the node operator to calculate for
    function getNodeMinimumRPLStake(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaNetworkPricesInterface poolseaNetworkPrices = PoolseaNetworkPricesInterface(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Retrieve variables
        uint256 minimumStakePercent = poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake();
        uint256 matchedETH = getNodeETHMatched(_nodeAddress);
        return matchedETH
            .mul(minimumStakePercent)
            .div(poolseaNetworkPrices.getRPLPrice());
    }

    /// @notice Calculate and return a node's maximum RPL stake to fully collateralise their minipools
    /// @param _nodeAddress The address of the node operator to calculate for
    function getNodeMaximumRPLStake(address _nodeAddress) override public view returns (uint256) {
        // Load contracts
        PoolseaNetworkPricesInterface poolseaNetworkPrices = PoolseaNetworkPricesInterface(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Retrieve variables
        uint256 maximumStakePercent = poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake();
        uint256 providedETH = getNodeETHProvided(_nodeAddress);
        return providedETH
            .mul(maximumStakePercent)
            .div(poolseaNetworkPrices.getRPLPrice());
    }

    /// @notice Calculate and return a node's limit of how much user ETH they can use based on RPL stake
    /// @param _nodeAddress The address of the node operator to calculate for
    function getNodeETHMatchedLimit(address _nodeAddress) override external view returns (uint256) {
        // Load contracts
        PoolseaNetworkPricesInterface poolseaNetworkPrices = PoolseaNetworkPricesInterface(getContractAddress("poolseaNetworkPrices"));
        PoolseaDAOProtocolSettingsNodeInterface poolseaDAOProtocolSettingsNode = PoolseaDAOProtocolSettingsNodeInterface(getContractAddress("poolseaDAOProtocolSettingsNode"));
        // Calculate & return limit
        uint256 minimumStakePercent = poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake();
        return getNodeRPLStake(_nodeAddress)
            .mul(poolseaNetworkPrices.getRPLPrice())
            .div(minimumStakePercent);
    }

    /// @notice Accept an RPL stake
    ///         Only accepts calls from registered nodes
    ///         Requires call to have approved this contract to spend RPL
    /// @param _amount The amount of RPL to stake
    function stakeRPL(uint256 _amount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(msg.sender) {
        _stakeRPL(msg.sender, _amount);
    }

    /// @notice Accept an RPL stake from any address for a specified node
    ///         Requires caller to have approved this contract to spend RPL
    ///         Requires caller to be on the node operator's allow list (see `setStakeForAllowed`)
    /// @param _nodeAddress The address of the node operator to stake on behalf of
    /// @param _amount The amount of RPL to stake
    function stakeRPLFor(address _nodeAddress, uint256 _amount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(_nodeAddress) {
       // Must be node's withdrawal address, allow listed address or poolseaMerkleDistributorMainnet
       if (msg.sender != getAddress(keccak256(abi.encodePacked("contract.address", "poolseaMerkleDistributorMainnet")))) {
           address withdrawalAddress = poolseaStorage.getNodeWithdrawalAddress(_nodeAddress);
           if (msg.sender != withdrawalAddress) {
               require(getBool(keccak256(abi.encodePacked("node.stake.for.allowed", _nodeAddress, msg.sender))), "Not allowed to stake for");
           }
       }
       _stakeRPL(_nodeAddress, _amount);
    }

    /// @notice Explicitly allow or remove allowance of an address to be able to stake on behalf of a node
    /// @param _caller The address you wish to allow
    /// @param _allowed Whether the address is allowed or denied
    function setStakeRPLForAllowed(address _caller, bool _allowed) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredNode(msg.sender) {
        setBool(keccak256(abi.encodePacked("node.stake.for.allowed", msg.sender, _caller)), _allowed);
        emit StakeRPLForAllowed(msg.sender, _caller, _allowed, block.timestamp);
    }

    /// @dev Internal logic for staking RPL
    /// @param _nodeAddress The address to increase the RPL stake of
    /// @param _amount The amount of RPL to stake
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
        // Update RPL stake amounts & node RPL staked block
        increaseTotalRPLStake(_amount);
        increaseNodeRPLStake(_nodeAddress, _amount);
        setNodeRPLStakedTime(_nodeAddress, block.timestamp);
        // Emit RPL staked event
        emit RPLStaked(_nodeAddress, _amount, block.timestamp);
    }

    /// @notice Withdraw staked RPL back to the node account
    ///         Only accepts calls from registered nodes
    ///         Withdraws to withdrawal address if set, otherwise defaults to node address
    /// @param _amount The amount of RPL to withdraw
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
        // Transfer RPL tokens to node address
        poolseaVault.withdrawToken(poolseaStorage.getNodeWithdrawalAddress(msg.sender), IERC20(getContractAddress("poolseaTokenRPL")), _amount);
        // Emit RPL withdrawn event
        emit RPLWithdrawn(msg.sender, _amount, block.timestamp);
    }

    /// @notice Slash a node's RPL by an ETH amount
    ///         Only accepts calls from registered minipools
    /// @param _nodeAddress The address to slash RPL from
    /// @param _ethSlashAmount The amount of RPL to slash denominated in ETH value
    function slashRPL(address _nodeAddress, uint256 _ethSlashAmount) override external onlyLatestContract("poolseaNodeStaking", address(this)) onlyRegisteredMinipool(msg.sender) {
        // Load contracts
        PoolseaNetworkPricesInterface poolseaNetworkPrices = PoolseaNetworkPricesInterface(getContractAddress("poolseaNetworkPrices"));
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
        // Mark minipool as slashed
        setBool(keccak256(abi.encodePacked("minipool.rpl.slashed", msg.sender)), true);
        // Emit RPL slashed event
        emit RPLSlashed(_nodeAddress, rplSlashAmount, _ethSlashAmount, block.timestamp);
    }

}
