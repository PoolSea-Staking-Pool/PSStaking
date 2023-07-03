import { PoolseaNodeManager } from '../_utils/artifacts';


// Set a node's timezone location
export async function setTimezoneLocation(timezoneLocation, txOptions) {
    // Load contracts
    const rocketNodeManager = await PoolseaNodeManager.deployed();

    // Set timezone location
    await rocketNodeManager.setTimezoneLocation(timezoneLocation, txOptions);

    // Get timezone location
    let nodeTimezoneLocation = await rocketNodeManager.getNodeTimezoneLocation.call(txOptions.from);

    // Check
    assert.strictEqual(nodeTimezoneLocation, timezoneLocation, 'Incorrect updated timezone location');
}
