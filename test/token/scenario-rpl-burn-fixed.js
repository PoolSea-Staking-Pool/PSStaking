import { PoolseaTokenRPL } from '../_utils/artifacts';
import { PoolseaTokenDummyRPL } from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';

// Burn current fixed supply RPL for new RPL
export async function burnFixedRPL(amount, txOptions) {
    // Load contracts
    const poolseaTokenRPL = await PoolseaTokenRPL.deployed();
    const poolseaTokenDummyRPL = await PoolseaTokenDummyRPL.deployed();

    // Get balances
    function getBalances() {
        return Promise.all([
            poolseaTokenDummyRPL.balanceOf.call(txOptions.from),
            poolseaTokenRPL.totalSupply.call(),
            poolseaTokenRPL.balanceOf.call(txOptions.from),
            poolseaTokenDummyRPL.balanceOf.call(poolseaTokenRPL.address),
            poolseaTokenRPL.balanceOf.call(poolseaTokenRPL.address),
        ]).then(
            ([rplFixedUserBalance, rplTokenSupply, rplUserBalance, rplContractBalanceOfFixedSupply, rplContractBalanceOfSelf]) =>
            ({rplFixedUserBalance, rplTokenSupply, rplUserBalance, rplContractBalanceOfFixedSupply, rplContractBalanceOfSelf})
        );
    }

    // Get initial balances
    let balances1 = await getBalances();

    // Burn tokens & get tx fee
    await poolseaTokenRPL.swapTokens(amount, txOptions);

    // Get updated balances
    let balances2 = await getBalances();

    // Calculate values
    let mintAmount = web3.utils.toBN(amount);

    // Check balances
    assertBN.equal(balances2.rplUserBalance, balances1.rplUserBalance.add(mintAmount), 'Incorrect updated user token balance');
    assertBN.equal(balances2.rplContractBalanceOfSelf, balances1.rplContractBalanceOfSelf.sub(mintAmount), 'RPL contract has not sent the RPL to the user address');
}
