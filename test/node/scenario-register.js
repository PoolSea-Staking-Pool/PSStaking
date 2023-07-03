import { PoolseaNodeManager } from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Register a node
export async function register(timezoneLocation, txOptions) {

    // Load contracts
    const poolseaNodeManager = await PoolseaNodeManager.deployed();

    // Get node details
    function getNodeDetails(nodeAddress) {
        return Promise.all([
            poolseaNodeManager.getNodeExists.call(nodeAddress),
            poolseaNodeManager.getNodeTimezoneLocation.call(nodeAddress),
        ]).then(
            ([exists, timezoneLocation]) =>
            ({exists, timezoneLocation})
        );
    }

    // Get initial node index
    let nodeCount1 = await poolseaNodeManager.getNodeCount.call();

    // Register
    await poolseaNodeManager.registerNode(timezoneLocation, txOptions);

    // Get updated node index & node details
    let nodeCount2 = await poolseaNodeManager.getNodeCount.call();
    let [lastNodeAddress, details] = await Promise.all([
        poolseaNodeManager.getNodeAt.call(nodeCount2.sub('1'.BN)),
        getNodeDetails(txOptions.from),
    ]);

    // Check details
    assertBN.equal(nodeCount2, nodeCount1.add('1'.BN), 'Incorrect updated node count');
    assert.strictEqual(lastNodeAddress, txOptions.from, 'Incorrect updated node index');
    assert.isTrue(details.exists, 'Incorrect node exists flag');
    assert.strictEqual(details.timezoneLocation, timezoneLocation, 'Incorrect node timezone location');
}
