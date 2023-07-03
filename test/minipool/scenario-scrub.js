// Dissolve a minipool
import {
    PoolseaDAONodeTrusted,
    PoolseaDAONodeTrustedSettingsMinipool, PoolseaDAOProtocolSettingsNode, PoolseaNetworkPrices,
    PoolseaNodeStaking,
    PoolseaTokenRPL,
    PoolseaVault
} from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';
import { minipoolStates } from '../_helpers/minipool';


export async function voteScrub(minipool, txOptions) {
    // Get minipool owner
    const nodeAddress = await minipool.getNodeAddress.call();

    // Get contracts
    const poolseaNodeStaking = await PoolseaNodeStaking.deployed();
    const poolseaVault = await PoolseaVault.deployed();
    const poolseaTokenRPL = await PoolseaTokenRPL.deployed();
    const poolseaDAONodeTrustedSettingsMinipool = await PoolseaDAONodeTrustedSettingsMinipool.deployed();
    const poolseaNetworkPrices = await PoolseaNetworkPrices.deployed();
    const poolseaDAOProtocolSettingsNode = await PoolseaDAOProtocolSettingsNode.deployed();

    // Get minipool details
    function getMinipoolDetails() {
        return Promise.all([
            minipool.getStatus.call(),
            minipool.getUserDepositBalance.call(),
            minipool.getTotalScrubVotes.call(),
            poolseaNodeStaking.getNodeRPLStake.call(nodeAddress),
            poolseaVault.balanceOfToken('poolseaAuctionManager', poolseaTokenRPL.address),
            poolseaDAONodeTrustedSettingsMinipool.getScrubPenaltyEnabled(),
            minipool.getVacant.call()
        ]).then(
            ([status, userDepositBalance, votes, nodeRPLStake, auctionBalance, penaltyEnabled, vacant]) =>
            ({status, userDepositBalance, votes, nodeRPLStake, auctionBalance, penaltyEnabled, vacant})
        );
    }

    // Get initial minipool details
    let details1 = await getMinipoolDetails();

    // Dissolve
    await minipool.voteScrub(txOptions);

    // Get updated minipool details
    let details2 = await getMinipoolDetails();

    // Get member count
    const poolseaDAONodeTrusted = await PoolseaDAONodeTrusted.deployed();
    const memberCount = await poolseaDAONodeTrusted.getMemberCount();
    const quorum = memberCount.div('2'.BN);

    // Check state
    if (details1.votes.add('1'.BN).gt(quorum)){
        assertBN.equal(details2.status, minipoolStates.Dissolved, 'Incorrect updated minipool status');
        // Check slashing if penalties are enabled
        if (details1.penaltyEnabled && !details1.vacant) {
            // Calculate amount slashed
            const slashAmount = details1.nodeRPLStake.sub(details2.nodeRPLStake);
            // Get current RPL price
            const rplPrice = await poolseaNetworkPrices.getRPLPrice.call();
            // Calculate amount slashed in ETH
            const slashAmountEth = slashAmount.mul(rplPrice).div('1'.ether);
            // Calculate expected slash amount
            const minimumStake = await poolseaDAOProtocolSettingsNode.getMinimumPerMinipoolStake();
            const expectedSlash = details1.userDepositBalance.mul(minimumStake).div('1'.ether);
            // Perform checks
            assertBN.equal(slashAmountEth, expectedSlash, 'Amount of RPL slashed is incorrect');
            assertBN.equal(details2.auctionBalance.sub(details1.auctionBalance), slashAmount, 'RPL was not sent to auction manager');
        }
    } else {
        assertBN.equal(details2.votes.sub(details1.votes), 1, 'Vote count not incremented');
        assertBN.notEqual(details2.status, minipoolStates.Dissolved, 'Incorrect updated minipool status');
        assertBN.equal(details2.nodeRPLStake, details1.nodeRPLStake, 'RPL was slashed');
    }
}
