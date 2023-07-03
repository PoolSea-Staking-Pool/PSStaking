import { PoolseaDAONodeTrusted, PoolseaDAONodeTrustedActions, PoolseaDAONodeTrustedSettingsMembers } from '../_utils/artifacts';
import { mintRPL, approveRPL } from './tokens';


export async function mintRPLBond(owner, node) {

    // Load contracts
    const [
        poolseaDAONodeTrustedActions,
        poolseaDAONodeTrustedSettings,
    ] = await Promise.all([
        PoolseaDAONodeTrustedActions.deployed(),
        PoolseaDAONodeTrustedSettingsMembers.deployed(),
    ]);

    // Get RPL bond amount
    const bondAmount = await poolseaDAONodeTrustedSettings.getRPLBond.call();

    // Mint RPL amount and approve DAO node contract to spend
    await mintRPL(owner, node, bondAmount);
    await approveRPL(poolseaDAONodeTrustedActions.address, bondAmount, {from: node});

}


export async function bootstrapMember(address, id, url, txOptions) {
    const poolseaDAONodeTrusted = await PoolseaDAONodeTrusted.deployed();
    await poolseaDAONodeTrusted.bootstrapMember(id, url, address, txOptions);
}


export async function memberJoin(txOptions) {
    const poolseaDAONodeTrustedActions = await PoolseaDAONodeTrustedActions.deployed();
    await poolseaDAONodeTrustedActions.actionJoin(txOptions);
}

