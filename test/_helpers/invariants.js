const { PoolseaNodeManager, PoolseaMinipoolManager, PoolseaMinipoolDelegate } = require('../_utils/artifacts');
const { assertBN } = require('./bn');

async function checkInvariants() {
    const nodeAddresses = await getNodeAddresses();

    for (const nodeAddress of nodeAddresses) {
        const minipools = await getMinipoolsByNode(nodeAddress);
        await checkNodeInvariants(nodeAddress, minipools);
    }
}

async function getNodeAddresses() {
    const poolseaNodeManager = await PoolseaNodeManager.deployed();
    return await poolseaNodeManager.getNodeAddresses(0, 1000);
}

async function getMinipoolDetails(address) {
    const minipool = await PoolseaMinipoolDelegate.at(address);

    const [status, finalised, nodeFee, userDepositBalance, nodeDepositBalance] = await Promise.all([
        minipool.getStatus(),
        minipool.getFinalised(),
        minipool.getNodeFee(),
        minipool.getUserDepositBalance(),
        minipool.getNodeDepositBalance(),
    ]);

    return {
        status: status.toString(),
        finalised,
        nodeFee,
        userDepositBalance,
        nodeDepositBalance
    };
}

async function getMinipoolsByNode(nodeAddress) {
    const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
    const count = await poolseaMinipoolManager.getNodeMinipoolCount(nodeAddress);
    const minipools = [];
    for (let i = 0; i < count; i++) {
        const address = await poolseaMinipoolManager.getNodeMinipoolAt(nodeAddress, i);
        minipools.push(await getMinipoolDetails(address));
    }
    return minipools;
}

async function checkNodeInvariants(nodeAddress, minipools) {
    const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
    const poolseaNodeManager = await PoolseaNodeManager.deployed();
    const depositSizes = ['8000000'.ether, '16000000'.ether];
    // Filter "staking" minipools
    const stakingMinipools = minipools.filter(minipool => minipool.status === '2' && minipool.finalised === false);
    // Check overall counts
    const [expectedActive, expectedFinalised, expectedStaking] = await Promise.all([
        poolseaMinipoolManager.getNodeActiveMinipoolCount(nodeAddress),
        poolseaMinipoolManager.getNodeFinalisedMinipoolCount(nodeAddress),
        poolseaMinipoolManager.getNodeStakingMinipoolCount(nodeAddress),
    ]);
    const actualActive = minipools.filter(minipool => minipool.finalised !== true).length;
    const actualFinalised = minipools.length - actualActive;
    const actualStaking = stakingMinipools.length;
    assert.equal(actualActive, expectedActive.toNumber(), 'Active minipool count invariant broken');
    assert.equal(actualFinalised, expectedFinalised.toNumber(), 'Finalised minipool count invariant broken');
    assert.equal(actualStaking, expectedStaking.toNumber(), 'Staking minipool count invariant broken');
    // Check deposit size counts
    const countBySize = await Promise.all(depositSizes.map(depositSize => poolseaMinipoolManager.getNodeStakingMinipoolCountBySize(nodeAddress, depositSize)));
    for (let i = 0; i < depositSizes.length; i++) {
        const depositSize = depositSizes[i];
        const actualCount = countBySize[i].toNumber();
        const expectedCount = stakingMinipools.filter(minipool => minipool.nodeDepositBalance.eq(depositSize)).length;
        assert.equal(actualCount, expectedCount, 'Deposit size specific staking minipool count invariant broken');
    }
    // Check weighted average node fee
    const expectedFee = weightedAverage(
        stakingMinipools.map(minipool => minipool.nodeFee),
        stakingMinipools.map(minipool => minipool.userDepositBalance),
    );
    const actualFee = await poolseaNodeManager.getAverageNodeFee(nodeAddress);
    assertBN.equal(actualFee, expectedFee, 'Average node fee invariant broken');
}

function weightedAverage(nums, weights) {
    if (nums.length === 0) {
        return '0'.BN;
    }
    const [sum, weightSum] = weights.reduce(
        (acc, w, i) => {
            acc[0] = acc[0].add(nums[i].mul(w));
            acc[1] = acc[1].add(w);
            return acc;
        },
        ['0'.BN, '0'.BN],
    );
    return sum.div(weightSum);
}

module.exports = { checkInvariants };
