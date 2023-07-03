import { PoolseaNodeManager } from '../_utils/artifacts';


// Set a node's timezone location
export async function setTimezoneLocation(timezoneLocation, txOptions) {
    // Load contracts
    const poolseaNodeManager = await PoolseaNodeManager.deployed();

    // Set timezone location
    await poolseaNodeManager.setTimezoneLocation(timezoneLocation, txOptions);

    // Get timezone location
    let nodeTimezoneLocation = await poolseaNodeManager.getNodeTimezoneLocation.call(txOptions.from);

    // Check
    assert.strictEqual(nodeTimezoneLocation, timezoneLocation, 'Incorrect updated timezone location');
}
