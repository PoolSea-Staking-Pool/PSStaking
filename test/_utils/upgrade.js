import { PoolseaDAOProtocolSettingsMinipool, PoolseaDAOProtocolSettingsNode, PoolseaUpgradeOneDotTwo } from './artifacts';
import { setDAOProtocolBootstrapSetting } from '../dao/scenario-dao-protocol-bootstrap';


export async function upgradeOneDotTwo(guardian) {
  const poolseaUpgradeOneDotTwo = await PoolseaUpgradeOneDotTwo.deployed();
  await poolseaUpgradeOneDotTwo.execute({ from: guardian });

  // Set default test parameters
  await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsMinipool, 'minipool.bond.reduction.enabled', true, { from: guardian });
  await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNode, 'node.vacant.minipools.enabled', true, { from: guardian });
}

export async function upgradeExecuted() {
  const poolseaUpgradeOneDotTwo = await PoolseaUpgradeOneDotTwo.deployed();
  return await poolseaUpgradeOneDotTwo.executed();
}
