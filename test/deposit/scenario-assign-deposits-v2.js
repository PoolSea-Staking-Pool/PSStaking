import {
    PoolseaDepositPool,
    PoolseaDAOProtocolSettingsDeposit,
    PoolseaMinipoolQueue,
    PoolseaDAOProtocolSettingsMinipool,
    PoolseaVault,
    PoolseaMinipoolDelegate,
} from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Assign deposits to minipools
export async function assignDepositsV2(txOptions) {
    // Load contracts
    const [
        poolseaDepositPool,
        poolseaDAOProtocolSettingsDeposit,
        poolseaMinipoolQueue,
        poolseaDAOProtocolSettingsMinipool,
        poolseaVault,
    ] = await Promise.all([
        PoolseaDepositPool.deployed(),
        PoolseaDAOProtocolSettingsDeposit.deployed(),
        PoolseaMinipoolQueue.deployed(),
        PoolseaDAOProtocolSettingsMinipool.deployed(),
        PoolseaVault.deployed(),
    ]);

    // Get parameters
    let [
        depositPoolBalance,
        maxDepositAssignments,
        maxSocialisedAssignments,
        minipoolQueueLength,
        fullMinipoolQueueLength, halfMinipoolQueueLength, emptyMinipoolQueueLength,
        fullDepositUserAmount, halfDepositUserAmount, emptyDepositUserAmount,
    ] = await Promise.all([
        poolseaVault.balanceOf.call("poolseaDepositPool"),
        poolseaDAOProtocolSettingsDeposit.getMaximumDepositAssignments.call(),
        poolseaDAOProtocolSettingsDeposit.getMaximumDepositSocialisedAssignments.call(),
        poolseaMinipoolQueue.getLength.call(),
        poolseaMinipoolQueue.getLengthLegacy.call(1), poolseaMinipoolQueue.getLengthLegacy.call(2), poolseaMinipoolQueue.getLengthLegacy.call(3),
        poolseaDAOProtocolSettingsMinipool.getDepositUserAmount(1), poolseaDAOProtocolSettingsMinipool.getDepositUserAmount(2), poolseaDAOProtocolSettingsMinipool.getDepositUserAmount(3),
    ]);

    // Get queued minipool capacities
    let minipoolCapacities = [];
    for (let i = 0; i < halfMinipoolQueueLength; ++i)  minipoolCapacities.push(halfDepositUserAmount);
    for (let i = 0; i < fullMinipoolQueueLength; ++i)  minipoolCapacities.push(fullDepositUserAmount);
    for (let i = 0; i < emptyMinipoolQueueLength; ++i) minipoolCapacities.push(emptyDepositUserAmount);

    // Get expected deposit assignment parameters
    let expectedDepositAssignments = 0;
    let expectedEthAssigned = '0'.ether;
    let expectedNodeBalanceUsed = '0'.ether;
    let depositBalanceRemaining = depositPoolBalance;
    let depositAssignmentsRemaining = maxDepositAssignments;

    while (minipoolCapacities.length > 0 && depositBalanceRemaining.gte(minipoolCapacities[0]) && depositAssignmentsRemaining > 0) {
        let capacity = minipoolCapacities.shift();
        ++expectedDepositAssignments;
        expectedEthAssigned = expectedEthAssigned.add(capacity);
        depositBalanceRemaining = depositBalanceRemaining.sub(capacity);
        --depositAssignmentsRemaining;
    }

    // No legacy deposits
    if (expectedDepositAssignments === 0) {
        let scalingCount = maxSocialisedAssignments.toNumber();
        let totalEthCount = depositPoolBalance.div('32000000'.ether).toNumber();
        expectedDepositAssignments = Math.min(scalingCount, totalEthCount, maxDepositAssignments.toNumber(), minipoolQueueLength.toNumber());
        expectedEthAssigned = '31999999'.ether.mul(expectedDepositAssignments.BN);

        let indices = [...Array(expectedDepositAssignments).keys()];
        let addressesInQueue = await Promise.all(indices.map(i => poolseaMinipoolQueue.getMinipoolAt(i)));
        let minipoolsInQueue = await Promise.all(addressesInQueue.map(a => PoolseaMinipoolDelegate.at(a)));
        let topUpValues = await Promise.all(minipoolsInQueue.map(m => m.getNodeTopUpValue()))
        expectedNodeBalanceUsed = topUpValues.reduce((p, c) => p.add(c), expectedNodeBalanceUsed);
    }

    // Get balances
    function getBalances() {
        return Promise.all([
            poolseaDepositPool.getBalance.call(),
            poolseaDepositPool.getNodeBalance.call(),
            web3.eth.getBalance(poolseaVault.address).then(value => value.BN),
        ]).then(
            ([depositPoolEth, depositPoolNodeEth, vaultEth]) =>
            ({depositPoolEth, depositPoolNodeEth, vaultEth})
        );
    }

    // Get minipool queue details
    function getMinipoolQueueDetails() {
        return Promise.all([
            poolseaMinipoolQueue.getTotalLength.call(),
            poolseaMinipoolQueue.getTotalCapacity.call(),
        ]).then(
            ([totalLength, totalCapacity]) =>
            ({totalLength, totalCapacity})
        );
    }

    // Get initial balances & minipool queue details
    let [balances1, queue1] = await Promise.all([
        getBalances(),
        getMinipoolQueueDetails(),
    ]);

    // Assign deposits
    await poolseaDepositPool.assignDeposits(txOptions);

    // Get updated balances & minipool queue details
    let [balances2, queue2] = await Promise.all([
        getBalances(),
        getMinipoolQueueDetails(),
    ]);

    // Check balances
    assertBN.equal(balances2.depositPoolEth, balances1.depositPoolEth.sub(expectedEthAssigned), 'Incorrect updated deposit pool ETH balance');
    assertBN.equal(balances2.depositPoolNodeEth, balances1.depositPoolNodeEth.sub(expectedNodeBalanceUsed), 'Incorrect updated deposit pool node ETH balance');
    assertBN.equal(balances2.vaultEth, balances1.vaultEth.sub(expectedEthAssigned), 'Incorrect updated vault ETH balance');

    // Check minipool queues
    assertBN.equal(queue2.totalLength, queue1.totalLength.sub(expectedDepositAssignments.BN), 'Incorrect updated minipool queue length');
    assertBN.equal(queue2.totalCapacity, queue1.totalCapacity.sub(expectedEthAssigned), 'Incorrect updated minipool queue capacity');
}
