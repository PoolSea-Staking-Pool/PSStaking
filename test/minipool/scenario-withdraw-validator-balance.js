import {
    PoolseaDepositPool,
    PoolseaMinipoolPenalty,
    PoolseaNodeManager,
    PoolseaTokenRETH
} from '../_utils/artifacts'
import { assertBN } from '../_helpers/bn';

export async function withdrawValidatorBalance(minipool, withdrawalBalance, from) {
    // Load contracts
    const [
        poolseaDepositPool,
        poolseaTokenRETH,
        poolseaNodeManager
    ] = await Promise.all([
        PoolseaDepositPool.deployed(),
        PoolseaTokenRETH.deployed(),
        PoolseaNodeManager.deployed(),
    ]);

    // Get node parameters
    let nodeAddress = await minipool.getNodeAddress.call();
    let nodeWithdrawalAddress = await poolseaNodeManager.getNodeWithdrawalAddress.call(nodeAddress);

    // Get parameters
    let [
        nodeFee
    ] = await Promise.all([
        minipool.getNodeFee.call(),
    ]);

    // Get balances
    function getBalances() {
        return Promise.all([
            web3.eth.getBalance(poolseaTokenRETH.address).then(value => value.BN),
            poolseaDepositPool.getBalance.call(),
            web3.eth.getBalance(nodeWithdrawalAddress).then(value => value.BN),
            web3.eth.getBalance(minipool.address).then(value => value.BN),
        ]).then(
          ([rethContractEth, depositPoolEth, nodeWithdrawalEth, minipoolEth]) =>
            ({rethContractEth, depositPoolEth, nodeWithdrawalEth, minipoolEth})
        );
    }

    // Get minipool balances
    function getMinipoolBalances() {
        return Promise.all([
            minipool.getNodeDepositBalance.call(),
            minipool.getNodeRefundBalance.call(),
            minipool.getUserDepositBalance.call(),
        ]).then(
          ([nodeDepositBalance, nodeRefundBalance, userDepositBalance]) =>
            ({nodeDepositBalance, nodeRefundBalance, userDepositBalance})
        );
    }

    // Send validator balance to minipool
    if (withdrawalBalance.gt('0'.BN)) {
        await web3.eth.sendTransaction({
            from: from,
            to: minipool.address,
            gas: 12450000,
            value: withdrawalBalance
        });
    }

    // Get total withdrawal balance
    withdrawalBalance = (await web3.eth.getBalance(minipool.address)).BN;

    // Get initial balances & withdrawal processed status
    let [balances1, minipoolBalances1] = await Promise.all([
        getBalances(),
        getMinipoolBalances()
    ]);

    // Set gas price
    let gasPrice = '20'.gwei;

    // Payout the balances now
    let txReceipt = await minipool.distributeBalance(false, {
        from: from,
        gasPrice: gasPrice
    });

    let txFee = gasPrice.mul(web3.utils.toBN(txReceipt.receipt.gasUsed));

    // Get updated balances & withdrawal processed status
    let [balances2, minipoolBalances2] = await Promise.all([
        getBalances(),
        getMinipoolBalances()
    ]);

    // Add the fee back into the balance to make assertions easier
    if (from === nodeWithdrawalAddress) {
      balances2.nodeWithdrawalEth = balances2.nodeWithdrawalEth.add(txFee);
    }

    let nodeBalanceChange = balances2.nodeWithdrawalEth.add(minipoolBalances2.nodeRefundBalance).sub(balances1.nodeWithdrawalEth.add(minipoolBalances1.nodeRefundBalance));
    let rethBalanceChange = balances2.rethContractEth.sub(balances1.rethContractEth);
    let depositPoolChange = balances2.depositPoolEth.sub(balances1.depositPoolEth);

    // Get penalty rate for this minipool
    const poolseaMinipoolPenalty = await PoolseaMinipoolPenalty.deployed();
    const penaltyRate = await poolseaMinipoolPenalty.getPenaltyRate(minipool.address);

    // Calculate rewards
    let depositBalance = '32000000'.ether;
    if (withdrawalBalance.gte(depositBalance)) {
        let depositType = await minipool.getDepositType();
        let userAmount = minipoolBalances1.userDepositBalance;
        let rewards = withdrawalBalance.sub(depositBalance);
        if (depositType.toString() === '3'){
            // Unbonded
            let halfRewards = rewards.divn(2);
            let nodeCommissionFee = halfRewards.mul(nodeFee).div(web3.utils.toBN(web3.utils.toWei('1')));
            userAmount = userAmount.add(rewards.sub(nodeCommissionFee));
        } else if (depositType.toString() === '2' || depositType.toString() === '1'){
            // Half or full
            let halfRewards = rewards.divn(2);
            let nodeCommissionFee = halfRewards.mul(nodeFee).div(web3.utils.toBN(web3.utils.toWei('1')));
            userAmount = userAmount.add(halfRewards.sub(nodeCommissionFee));
        } else if (depositType.toString() === '4') {
            // Variable
            const nodeCapital = minipoolBalances1.nodeDepositBalance;
            let nodeRewards = rewards.mul(nodeCapital).div(userAmount.add(nodeCapital));
            nodeRewards = nodeRewards.add(rewards.sub(nodeRewards).mul(nodeFee).div(web3.utils.toBN(web3.utils.toWei('1'))));
            userAmount = userAmount.add(rewards.sub(nodeRewards));
        }
        let nodeAmount = withdrawalBalance.sub(userAmount);

        // Adjust amounts according to penalty rate
        if (penaltyRate.gt(0)) {
            let penaltyAmount = nodeAmount.mul(penaltyRate).div(web3.utils.toBN(web3.utils.toWei('1')));
            if (penaltyRate.gt(nodeAmount)) {
                penaltyAmount = nodeAmount;
            }
            nodeAmount = nodeAmount.sub(penaltyAmount);
            userAmount = userAmount.add(penaltyAmount);
        }

        // console.log('Rewards: ', web3.utils.fromWei(rewards));
        // console.log('Node amount: ', web3.utils.fromWei(nodeAmount));
        // console.log('User amount: ', web3.utils.fromWei(userAmount));

        // Check balances
        assertBN.equal(rethBalanceChange.add(depositPoolChange), userAmount, "rETH balance was not correct");
        assertBN.equal(nodeBalanceChange, nodeAmount, "Node balance was not correct");

        // If not sent from node operator then refund balance should be correct
        if (!(from === nodeWithdrawalAddress || from === nodeAddress)) {
            let refundBalance = await minipool.getNodeRefundBalance.call();
            // console.log('Node refund balance after withdrawal:', web3.utils.fromWei(refundBalance));
            assertBN.equal(refundBalance, minipoolBalances1.nodeRefundBalance.add(nodeAmount), "Node balance was not correct");
        }
    }

    return {
        nodeBalanceChange,
        rethBalanceChange
    }
}

export async function beginUserDistribute(minipool, txOptions) {
    await minipool.beginUserDistribute(txOptions);
}
