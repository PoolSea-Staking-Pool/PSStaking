import { PoolseaTokenRPLS, PoolseaTokenDummyRPL, PoolseaTokenPOOL } from '../_utils/artifacts';


// Get the RPL balance of an address
export async function getRplBalance(address) {
    const poolseaTokenRPL = await PoolseaTokenPOOL.deployed();
    let balance = poolseaTokenRPL.balanceOf.call(address);
    return balance;
}


// Get the rETH balance of an address
export async function getRethBalance(address) {
    const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
    let balance = poolseaTokenRETH.balanceOf.call(address);
    return balance;
}


// Get the current rETH exchange rate
export async function getRethExchangeRate() {
    const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
    let exchangeRate = await poolseaTokenRETH.getExchangeRate.call();
    return exchangeRate;
}


// Get the current rETH collateral rate
export async function getRethCollateralRate() {
    const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
    let collateralRate = await poolseaTokenRETH.getCollateralRate.call();
    return collateralRate;
}


// Get the current rETH token supply
export async function getRethTotalSupply() {
    const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
    let totalSupply = await poolseaTokenRETH.totalSupply.call();
    return totalSupply;
}


// Mint RPL to an address
export async function mintRPL(owner, toAddress, amount) {

    // Load contracts
    const [poolseaTokenDummyRPL, poolseaTokenRPL] = await Promise.all([
        PoolseaTokenDummyRPL.deployed(),
        PoolseaTokenPOOL.deployed(),
    ]);

    // Mint dummy RPL to address
    await poolseaTokenDummyRPL.mint(toAddress, amount, {from: owner});

    // Swap dummy RPL for RPL
    await poolseaTokenDummyRPL.approve(poolseaTokenRPL.address, amount, {from: toAddress});
    await poolseaTokenRPL.swapTokens(amount, {from: toAddress});

}


// Approve RPL to be spend by an address
export async function approveRPL(spender, amount, txOptions) {
    const poolseaTokenRPL = await PoolseaTokenPOOL.deployed();
    await poolseaTokenRPL.approve(spender, amount, txOptions);
}


export async function depositExcessCollateral(txOptions) {
    const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
    await poolseaTokenRETH.depositExcessCollateral(txOptions);
}
