import { setDAOProtocolBootstrapSetting } from '../dao/scenario-dao-protocol-bootstrap';
import {
    PoolseaDAOProtocolSettingsDeposit, PoolseaDAOProtocolSettingsInflation,
    PoolseaDAOProtocolSettingsMinipool, PoolseaDAOProtocolSettingsNetwork,
    PoolseaDAOProtocolSettingsNode,
} from '../_utils/artifacts';

export async function setDefaultParameters() {
    const [guardian] = await web3.eth.getAccounts();
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsDeposit, 'deposit.enabled', true, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsDeposit, 'deposit.assign.enabled', true, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsDeposit, 'deposit.pool.maximum', '1000000000'.ether, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNode, 'node.registration.enabled', true, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNode, 'node.deposit.enabled', true, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsMinipool, 'minipool.submit.withdrawable.enabled', true, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.node.fee.minimum', '0.05'.ether, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.node.fee.target', '0.1'.ether, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.node.fee.maximum', '0.2'.ether, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.node.demand.range', '1000'.ether, { from: guardian });
    await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsInflation, 'rpl.inflation.interval.start', Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24 * 14), { from: guardian });
}
