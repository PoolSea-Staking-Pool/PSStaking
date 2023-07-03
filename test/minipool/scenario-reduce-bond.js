import {
    PoolseaMinipoolBondReducer,
    PoolseaMinipoolManager,
    PoolseaNodeDeposit,
    PoolseaNodeStaking,
} from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Reduce bonding amount of a minipool
export async function reduceBond(minipool, txOptions = null) {
    const poolseaNodeDeposit = await PoolseaNodeDeposit.deployed();
    const poolseaNodeStaking = await PoolseaNodeStaking.deployed();
    const poolseaMinipoolBondReducer = await PoolseaMinipoolBondReducer.deployed();
    const poolseaNodeManager = await PoolseaMinipoolManager.deployed();
    const node = await minipool.getNodeAddress();

    const newBond = await poolseaMinipoolBondReducer.getReduceBondValue(minipool.address);
    const prevBond = await minipool.getNodeDepositBalance();

    // Get minipool balances
    function getMinipoolBalances() {
        return Promise.all([
            minipool.getNodeDepositBalance.call(),
            minipool.getUserDepositBalance.call(),
            poolseaNodeDeposit.getNodeDepositCredit(node),
            poolseaNodeStaking.getNodeETHMatched(node),
        ]).then(
            ([nodeDepositBalance, userDepositBalance, nodeDepositCredit, ethMatched]) =>
                ({nodeDepositBalance, userDepositBalance, nodeDepositCredit, ethMatched})
        );
    }

    // Get node details
    function getNodeDetails() {
        return Promise.all([
            poolseaNodeManager.getNodeStakingMinipoolCountBySize(node, prevBond),
            poolseaNodeManager.getNodeStakingMinipoolCountBySize(node, newBond),
            poolseaNodeManager.getNodeStakingMinipoolCount(node),
        ]).then(
            ([prevBondCount, newBondCount, totalCount]) =>
                ({prevBondCount, newBondCount, totalCount})
        )
    }

    // Get new bond amount
    const amount = await poolseaMinipoolBondReducer.getReduceBondValue(minipool.address);

    // Record balances before and after calling reduce bond function
    const balances1 = await getMinipoolBalances();
    const details1 = await getNodeDetails();
    await minipool.reduceBondAmount(txOptions);
    const balances2 = await getMinipoolBalances();
    const details2 = await getNodeDetails();

    // Verify results
    const delta = balances1.nodeDepositBalance.sub(amount);
    assertBN.equal(balances2.nodeDepositBalance, delta);
    assertBN.equal(balances2.userDepositBalance.sub(balances1.userDepositBalance), delta);
    assertBN.equal(balances2.nodeDepositCredit.sub(balances1.nodeDepositCredit), delta);
    assertBN.equal(balances2.ethMatched.sub(balances1.ethMatched), delta);

    // Overall number of minipools shouldn't change
    assertBN.equal(details2.totalCount, details1.totalCount);
    // Prev bond amount should decrement by 1
    assertBN.equal(details1.prevBondCount.sub(details2.prevBondCount), '1'.BN);
    // New bond amount should increment by 1
    assertBN.equal(details2.newBondCount.sub(details1.newBondCount), '1'.BN);
}
