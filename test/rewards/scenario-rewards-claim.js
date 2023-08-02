import { PoolseaDAOProtocolSettingsRewards, PoolseaRewardsPool } from '../_utils/artifacts';


// Get the current rewards claim period in blocks
export async function rewardsClaimIntervalTimeGet(txOptions) {
  // Load contracts
  const poolseaDAOProtocolSettingsRewards = await PoolseaDAOProtocolSettingsRewards.deployed();
  return await poolseaDAOProtocolSettingsRewards.getClaimIntervalTime.call();
}


// Get the current rewards claimers total
export async function rewardsClaimersPercTotalGet(txOptions) {
  // Load contracts
  const poolseaDAOProtocolSettingsRewards = await PoolseaDAOProtocolSettingsRewards.deployed();
  return await poolseaDAOProtocolSettingsRewards.getRewardsClaimersPercTotal.call();
}


// Get how many seconds needed until the next claim interval
export async function rewardsClaimIntervalsPassedGet(txOptions) {
  // Load contracts
  const poolseaRewardsPool = await PoolseaRewardsPool.deployed();
  return await poolseaRewardsPool.getClaimIntervalsPassed.call();
}

export async function rewardsFeeAddress(txOptions) {
  // Load contracts
  const poolseaDAOProtocolSettingsRewards = await PoolseaDAOProtocolSettingsRewards.deployed();
  return await poolseaDAOProtocolSettingsRewards.getRewardsFeeAddress.call();
}
