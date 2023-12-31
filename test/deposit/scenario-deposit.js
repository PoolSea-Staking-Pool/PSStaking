import {
    PoolseaDAOProtocolSettingsDeposit,
    PoolseaDepositPool,
    PoolseaDepositPoolOld,
    PoolseaTokenRPLS,
    PoolseaVault,
} from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


// Make a deposit into the deposit pool
export async function deposit(txOptions, preUpdate = false) {
    // Load contracts
    const [
        poolseaDAOProtocolSettingsDeposit,
        poolseaDepositPool,
        poolseaTokenRETH,
        poolseaVault,
    ] = await Promise.all([
        PoolseaDAOProtocolSettingsDeposit.deployed(),
        preUpdate ? PoolseaDepositPoolOld.deployed() : PoolseaDepositPool.deployed(),
        PoolseaTokenRPLS.deployed(),
        PoolseaVault.deployed(),
    ]);

    // Get parameters
    let depositFeePerc = await poolseaDAOProtocolSettingsDeposit.getDepositFee();

    // Get balances
    function getBalances() {
        return Promise.all([
            poolseaDepositPool.getBalance.call(),
            poolseaDepositPool.getNodeBalance.call(),
            web3.eth.getBalance(poolseaVault.address).then(value => value.BN),
            poolseaTokenRETH.balanceOf.call(txOptions.from),
        ]).then(
            ([depositPoolEth, depositPoolNodeEth, vaultEth, userReth]) =>
            ({depositPoolEth, depositPoolNodeEth, vaultEth, userReth})
        );
    }

    // Get initial balances
    let balances1 = await getBalances();

    // Deposit
    await poolseaDepositPool.deposit(txOptions);

    // Get updated balances
    let balances2 = await getBalances();

    // Calculate values
    let txValue = txOptions.value;
    let calcBase = '1'.ether;
    let depositFee = txValue.mul(depositFeePerc).div(calcBase);
    let expectedRethMinted = await poolseaTokenRETH.getRethValue(txValue.sub(depositFee));

    // Check balances
    assertBN.equal(balances2.depositPoolEth, balances1.depositPoolEth.add(txValue), 'Incorrect updated deposit pool ETH balance');
    assertBN.equal(balances2.vaultEth, balances1.vaultEth.add(txValue), 'Incorrect updated vault ETH balance');
    assertBN.equal(balances2.userReth, balances1.userReth.add(expectedRethMinted), 'Incorrect updated user rETH balance');
}
