import { PoolseaMinipoolManager, PoolseaDAOProtocolSettingsMinipool, PoolseaNetworkPrices, PoolseaDAOProtocolSettingsNode, PoolseaNodeStaking, PoolseaTokenRPL, PoolseaVault } from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Withdraw RPL staked against the node
export async function withdrawRpl(amount, txOptions) {

    // Load contracts
    const [
        poolseaMinipoolManager,
        poolseaDAOProtocolSettingsMinipool,
        poolseaNetworkPrices,
        poolseaDAOProtocolSettingsNode,
        poolseaNodeStaking,
        poolseaTokenRPL,
        poolseaVault,
    ] = await Promise.all([
        PoolseaMinipoolManager.deployed(),
        PoolseaDAOProtocolSettingsMinipool.deployed(),
        PoolseaNetworkPrices.deployed(),
        PoolseaDAOProtocolSettingsNode.deployed(),
        PoolseaNodeStaking.deployed(),
        PoolseaTokenRPL.deployed(),
        PoolseaVault.deployed(),
    ]);

    // Get parameters
    const [
        depositUserAmount,
        minPerMinipoolStake,
        maxPerMinipoolStake,
        rplPrice,
    ] = await Promise.all([
        poolseaDAOProtocolSettingsMinipool.getHalfDepositUserAmount.call(),
        poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake.call(),
        poolseaDAOProtocolSettingsNode.getMaximumPerMinipoolStake.call(),
        poolseaNetworkPrices.getRPLPrice.call(),
    ]);

    // Get token balances
    function getTokenBalances(nodeAddress) {
        return Promise.all([
            poolseaTokenRPL.balanceOf.call(nodeAddress),
            poolseaTokenRPL.balanceOf.call(poolseaVault.address),
            poolseaVault.balanceOfToken.call('poolseaNodeStaking', poolseaTokenRPL.address),
        ]).then(
            ([nodeRpl, vaultRpl, stakingRpl]) =>
            ({nodeRpl, vaultRpl, stakingRpl})
        );
    }

    // Get staking details
    function getStakingDetails(nodeAddress) {
        return Promise.all([
            poolseaNodeStaking.getTotalRPLStake.call(),
            poolseaNodeStaking.getNodeRPLStake.call(nodeAddress),
            poolseaNodeStaking.getNodeEffectiveRPLStake.call(nodeAddress),
            poolseaNodeStaking.getNodeETHMatched.call(nodeAddress),
            poolseaNodeStaking.getNodeETHMatchedLimit.call(nodeAddress),
        ]).then(
            ([totalStake, nodeStake, nodeEffectiveStake, nodeEthMatched, nodeEthMatchedLimit]) =>
            ({totalStake, nodeStake, nodeEffectiveStake, nodeEthMatched, nodeEthMatchedLimit})
        );
    }

    // Get minipool counts
    function getMinipoolCounts(nodeAddress) {
        return Promise.all([
            poolseaMinipoolManager.getMinipoolCount.call(),
            poolseaMinipoolManager.getNodeMinipoolCount.call(nodeAddress),
        ]).then(
            ([total, node]) =>
            ({total, node})
        );
    }

    // Get initial token balances & staking details
    let [balances1, details1] = await Promise.all([
        getTokenBalances(txOptions.from),
        getStakingDetails(txOptions.from),
    ]);

    // Withdraw RPL
    await poolseaNodeStaking.withdrawRPL(amount, txOptions);

    // Get updated token balances, staking details & minipool counts
    let [balances2, details2, minipoolCounts] = await Promise.all([
        getTokenBalances(txOptions.from),
        getStakingDetails(txOptions.from),
        getMinipoolCounts(txOptions.from),
    ]);

    // Calculate expected effective stakes & node minipool limit
    const maxNodeEffectiveStake = details2.nodeEthMatched.mul(maxPerMinipoolStake).div(rplPrice);
    const expectedNodeEffectiveStake = (details2.nodeStake.lt(maxNodeEffectiveStake)? details2.nodeStake : maxNodeEffectiveStake);
    const expectedNodeEthMatchedLimit = details2.nodeStake.mul(rplPrice).div(minPerMinipoolStake);

    // Check token balances
    assertBN.equal(balances2.nodeRpl, balances1.nodeRpl.add(web3.utils.toBN(amount)), 'Incorrect updated node RPL balance');
    assertBN.equal(balances2.vaultRpl, balances1.vaultRpl.sub(web3.utils.toBN(amount)), 'Incorrect updated vault RPL balance');
    assertBN.equal(balances2.stakingRpl, balances1.stakingRpl.sub(web3.utils.toBN(amount)), 'Incorrect updated PoolseaNodeStaking contract RPL vault balance');

    // Check staking details
    assertBN.equal(details2.totalStake, details1.totalStake.sub(web3.utils.toBN(amount)), 'Incorrect updated total RPL stake');
    assertBN.equal(details2.nodeStake, details1.nodeStake.sub(web3.utils.toBN(amount)), 'Incorrect updated node RPL stake');
    assertBN.equal(details2.nodeEffectiveStake, expectedNodeEffectiveStake, 'Incorrect updated effective node RPL stake');
    assertBN.equal(details2.nodeEthMatchedLimit, expectedNodeEthMatchedLimit, 'Incorrect updated node minipool limit');
}
