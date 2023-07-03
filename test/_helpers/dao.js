import { PoolseaDAONodeTrusted, PoolseaDAONodeTrustedActions, PoolseaDAONodeTrustedSettingsMembers } from '../_utils/artifacts';
import { mintRPL, approveRPL } from './tokens';


export async function mintRPLBond(owner, node) {

    // Load contracts
    const [
        rocketDAONodeTrustedActions,
        rocketDAONodeTrustedSettings,
    ] = await Promise.all([
        PoolseaDAONodeTrustedActions.deployed(),
        PoolseaDAONodeTrustedSettingsMembers.deployed(),
    ]);

    // Get RPL bond amount
    const bondAmount = await rocketDAONodeTrustedSettings.getRPLBond.call();

    // Mint RPL amount and approve DAO node contract to spend
    await mintRPL(owner, node, bondAmount);
    await approveRPL(rocketDAONodeTrustedActions.address, bondAmount, {from: node});

}


export async function bootstrapMember(address, id, url, txOptions) {
    const rocketDAONodeTrusted = await PoolseaDAONodeTrusted.deployed();
    await rocketDAONodeTrusted.bootstrapMember(id, url, address, txOptions);
}


export async function memberJoin(txOptions) {
    const rocketDAONodeTrustedActions = await PoolseaDAONodeTrustedActions.deployed();
    await rocketDAONodeTrustedActions.actionJoin(txOptions);
}

