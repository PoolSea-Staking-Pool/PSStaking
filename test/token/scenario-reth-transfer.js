import { PoolseaTokenRETH } from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Transfer rETH between accounts
export async function transferReth(to, amount, txOptions) {
    // Load contracts
    const poolseaTokenRETH = await PoolseaTokenRETH.deployed();

    // Get balances
    function getBalances() {
        return Promise.all([
            poolseaTokenRETH.balanceOf.call(txOptions.from),
            poolseaTokenRETH.balanceOf.call(to)
        ]).then(
            ([userFromTokenBalance, userToTokenBalance]) =>
            ({userFromTokenBalance, userToTokenBalance})
        );
    }

    // Get initial balances
    let balances1 = await getBalances();

    // Transfer tokens
    await poolseaTokenRETH.transfer(to, amount, txOptions);

    // Get updated balances
    let balances2 = await getBalances();

    // Check balances
    assertBN.equal(balances2.userFromTokenBalance, balances1.userFromTokenBalance.sub(amount), 'Incorrect updated user token balance');
    assertBN.equal(balances2.userToTokenBalance, balances1.userToTokenBalance.add(amount), 'Incorrect updated user token balance');
}
