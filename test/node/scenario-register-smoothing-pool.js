import { PoolseaNodeManager, PoolseaNodeManagerOld } from '../_utils/artifacts';
import { upgradeExecuted } from '../_utils/upgrade';


// Register a node
export async function setSmoothingPoolRegistrationState(state, txOptions) {
    // Load contracts
    const poolseaNodeManager = await upgradeExecuted() ? await PoolseaNodeManager.deployed() : await PoolseaNodeManagerOld.deployed();

    // Register
    await poolseaNodeManager.setSmoothingPoolRegistrationState(state, txOptions);

    // Check details
    const newState = await poolseaNodeManager.getSmoothingPoolRegistrationState(txOptions.from);
    assert.strictEqual(newState, state, 'Incorrect smoothing pool registration state');
}
