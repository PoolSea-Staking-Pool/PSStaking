import { PoolseaNetworkBalances, PoolseaNetworkFees, PoolseaNetworkPrices } from '../_utils/artifacts';


// Get the network total ETH balance
export async function getTotalETHBalance() {
    const poolseaNetworkBalances = await PoolseaNetworkBalances.deployed();
    let balance = await poolseaNetworkBalances.getTotalETHBalance.call();
    return balance;
}


// Get the network staking ETH balance
export async function getStakingETHBalance() {
    const poolseaNetworkBalances = await PoolseaNetworkBalances.deployed();
    let balance = await poolseaNetworkBalances.getStakingETHBalance.call();
    return balance;
}


// Get the network ETH utilization rate
export async function getETHUtilizationRate() {
    const poolseaNetworkBalances = await PoolseaNetworkBalances.deployed();
    let utilizationRate = await poolseaNetworkBalances.getETHUtilizationRate.call();
    return utilizationRate;
}


// Submit network balances
export async function submitBalances(block, totalEth, stakingEth, rethSupply, txOptions) {
    const poolseaNetworkBalances = await PoolseaNetworkBalances.deployed();
    await poolseaNetworkBalances.submitBalances(block, totalEth, stakingEth, rethSupply, txOptions);
}


// Submit network token prices
export async function submitPrices(block, rplPrice, txOptions) {
    const poolseaNetworkPrices = await PoolseaNetworkPrices.deployed();
    await poolseaNetworkPrices.submitPrices(block, rplPrice, txOptions);
}


// Get network RPL price
export async function getRPLPrice() {
    const poolseaNetworkPrices = await PoolseaNetworkPrices.deployed();
    let price = await poolseaNetworkPrices.getRPLPrice.call();
    return price;
}


// Get the network node demand
export async function getNodeDemand() {
    const poolseaNetworkFees = await PoolseaNetworkFees.deployed();
    let nodeDemand = await poolseaNetworkFees.getNodeDemand.call();
    return nodeDemand;
}


// Get the current network node fee
export async function getNodeFee() {
    const poolseaNetworkFees = await PoolseaNetworkFees.deployed();
    let nodeFee = await poolseaNetworkFees.getNodeFee.call();
    return nodeFee;
}


// Get the network node fee for a node demand value
export async function getNodeFeeByDemand(nodeDemand) {
    const poolseaNetworkFees = await PoolseaNetworkFees.deployed();
    let nodeFee = await poolseaNetworkFees.getNodeFeeByDemand.call(nodeDemand);
    return nodeFee;
}



