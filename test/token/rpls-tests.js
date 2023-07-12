import { printTitle } from '../_utils/formatting';
import { shouldRevert } from '../_utils/testing';
import { getDepositExcessBalance, userDeposit } from '../_helpers/deposit';
import { getMinipoolMinimumRPLStake, createMinipool, stakeMinipool } from '../_helpers/minipool';
import { submitBalances } from '../_helpers/network';
import { registerNode, setNodeTrusted, nodeStakeRPL, setNodeWithdrawalAddress } from '../_helpers/node';
import { depositExcessCollateral, getRethBalance, getRethCollateralRate, getRethExchangeRate, getRethTotalSupply, mintRPL } from '../_helpers/tokens'
import { burnReth } from './scenario-rpls-burn';
import { transferReth } from './scenario-rpls-transfer'
import {
    PoolseaDAONodeTrustedSettingsMinipool, PoolseaDAOProtocolSettingsMinipool,
    PoolseaDAOProtocolSettingsNetwork,
    PoolseaTokenRPLS,
} from '../_utils/artifacts';
import { setDAOProtocolBootstrapSetting } from '../dao/scenario-dao-protocol-bootstrap';
import { beginUserDistribute, withdrawValidatorBalance } from '../minipool/scenario-withdraw-validator-balance';
import { increaseTime, mineBlocks } from '../_utils/evm'
import { setDAONodeTrustedBootstrapSetting } from '../dao/scenario-dao-node-trusted-bootstrap';
import { upgradeOneDotTwo } from '../_utils/upgrade';
import { assertBN } from '../_helpers/bn';

export default function() {
    contract('PoolseaTokenRPLS', async (accounts) => {

        // Accounts
        const [
            owner,
            node,
            nodeWithdrawalAddress,
            trustedNode,
            staker1,
            staker2,
            random,
        ] = accounts;

        let scrubPeriod = (60 * 60 * 24); // 24 hours

        // Setup
        let minipool;
        let withdrawalBalance = '36000000'.ether;
        let rethBalance;
        let submitPricesFrequency = 500;
        let depositDeplay = 100;
        const userDistributeStartTime = 60 * 60 * 24 * 90; // 90 days

        before(async () => {
            await upgradeOneDotTwo(owner);

            // Get current rETH exchange rate
            let exchangeRate1 = await getRethExchangeRate();

            // Make deposit
            await userDeposit({from: staker1, value: '16000000'.ether});

            // Register node & set withdrawal address
            await registerNode({from: node});
            await setNodeWithdrawalAddress(node, nodeWithdrawalAddress, {from: node});

            // Register trusted node
            await registerNode({from: trustedNode});
            await setNodeTrusted(trustedNode, 'saas_1', 'node@home.com', owner);

            // Set settings
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.reth.collateral.target', '1'.ether, {from: owner});
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.submit.prices.frequency', submitPricesFrequency, {from: owner});
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.reth.deposit.delay', depositDeplay, {from: owner});
            await setDAONodeTrustedBootstrapSetting(PoolseaDAONodeTrustedSettingsMinipool, 'minipool.scrub.period', scrubPeriod, {from: owner});
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsMinipool, 'minipool.user.distribute.window.start', userDistributeStartTime, {from: owner});

            // Stake RPL to cover minipools
            let rplStake = await getMinipoolMinimumRPLStake();
            await mintRPL(owner, node, rplStake);
            await nodeStakeRPL(rplStake, {from: node});

            // Create withdrawable minipool
            minipool = await createMinipool({from: node, value: '16000000'.ether});
            await increaseTime(web3, scrubPeriod + 1);
            await stakeMinipool(minipool, {from: node});

            // Update network ETH total to alter rETH exchange rate
            let rethSupply = await getRethTotalSupply();
            let nodeFee = await minipool.getNodeFee.call()
            let depositBalance = '32000000'.ether;
            let userAmount = '16000000'.ether;
            let rewards = web3.utils.toBN(withdrawalBalance).sub(depositBalance);
            let halfRewards = rewards.divn(2);
            let nodeCommissionFee = halfRewards.mul(nodeFee).div('1'.ether);
            let ethBalance = userAmount.add(halfRewards.sub(nodeCommissionFee));
            await submitBalances(1, ethBalance, 0, rethSupply, {from: trustedNode});

            // Get & check staker rETH balance
            rethBalance = await getRethBalance(staker1);
            assertBN.isAbove(rethBalance, 0, 'Incorrect staker rPLS balance');

            // Get & check updated rETH exchange rate
            let exchangeRate2 = await getRethExchangeRate();
            assert.notEqual(exchangeRate1, exchangeRate2, 'rPLS exchange rate has not changed');
        });


        it(printTitle('rPLS holder', 'can transfer rPLS after enough time has passed'), async () => {
            // Make user deposit
            const depositAmount = '20000000'.ether;
            await userDeposit({from: staker2, value: depositAmount});

            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Transfer rETH
            await transferReth(random, rethBalance, {
                from: staker1,
            });
        });


        it(printTitle('rPLS holder', 'can transfer rPLS without waiting if received via transfer'), async () => {
            // Make user deposit
            const depositAmount = '20000000'.ether;
            await userDeposit({from: staker2, value: depositAmount});

            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Transfer rETH
            await transferReth(random, rethBalance, {
                from: staker1,
            });

            // Transfer rETH again
            await transferReth(staker1, rethBalance, {
                from: random,
            });
        });


        it(printTitle('rPLS holder', 'can burn rPLS for ETH collateral'), async () => {
            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Send ETH to the minipool to simulate receiving from SWC
            await web3.eth.sendTransaction({
                from: trustedNode,
                to: minipool.address,
                value: withdrawalBalance
            });

            // Begin user distribution process
            await beginUserDistribute(minipool, {from: random});
            // Wait
            await increaseTime(web3, userDistributeStartTime + 1)
            // Withdraw without finalising
            await withdrawValidatorBalance(minipool, '0'.ether, random);

            // Burn rETH
            await burnReth(rethBalance, {
                from: staker1,
            });
        });


        it(printTitle('rPLS holder', 'can burn rPLS for excess deposit pool PLS'), async () => {
            // Make user deposit
            const depositAmount = '20000000'.ether;
            await userDeposit({from: staker2, value: depositAmount});

            // Check deposit pool excess balance
            let excessBalance = await getDepositExcessBalance();
            assertBN.equal(excessBalance, depositAmount, 'Incorrect deposit pool excess balance');

            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Burn rETH
            await burnReth(rethBalance, {
                from: staker1,
            });
        });


        it(printTitle('rPLS holder', 'cannot burn an invalid amount of rPLS'), async () => {
            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Send ETH to the minipool to simulate receving from SWC
            await web3.eth.sendTransaction({
                from: trustedNode,
                to: minipool.address,
                value: withdrawalBalance
            });

            // Begin user distribution process
            await beginUserDistribute(minipool, {from: random});
            // Wait
            await increaseTime(web3, userDistributeStartTime + 1)
            // Withdraw without finalising
            await withdrawValidatorBalance(minipool, '0'.ether, random);

            // Get burn amounts
            let burnZero = '0'.ether;
            let burnExcess = '100000000'.ether;
            assertBN.isAbove(burnExcess, rethBalance, 'Burn amount does not exceed rPLS balance');

            // Attempt to burn 0 rETH
            await shouldRevert(burnReth(burnZero, {
                from: staker1,
            }), 'Burned an invalid amount of rPLS');

            // Attempt to burn too much rETH
            await shouldRevert(burnReth(burnExcess, {
                from: staker1,
            }), 'Burned an amount of rPLS greater than the token balance');
        });


        it(printTitle('rPLS holder', 'cannot burn rPLS with insufficient collateral'), async () => {
            // Wait "network.reth.deposit.delay" blocks
            await mineBlocks(web3, depositDeplay);

            // Attempt to burn rETH for contract collateral
            await shouldRevert(burnReth(rethBalance, {
                from: staker1,
            }), 'Burned rPLS with an insufficient contract PLS balance');

            // Make user deposit
            const depositAmount = '10000000'.ether;
            await userDeposit({from: staker2, value: depositAmount});

            // Check deposit pool excess balance
            let excessBalance = await getDepositExcessBalance();
            assertBN.equal(excessBalance, depositAmount, 'Incorrect deposit pool excess balance');

            // Attempt to burn rETH for excess deposit pool ETH
            await shouldRevert(burnReth(rethBalance, {
                from: staker1,
            }), 'Burned rPLS with an insufficient deposit pool excess PLS balance');
        });


        it(printTitle('random', 'can deposit excess collateral into the deposit pool'), async () => {
            // Get rETH contract
            const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
            // Send enough ETH to rETH contract to exceed target collateralisation rate
            await web3.eth.sendTransaction({from: random, to: poolseaTokenRETH.address, value: web3.utils.toWei('32000000')});
            // Call the deposit excess function
            await depositExcessCollateral({from: random});
            // Collateral should now be at the target rate
            const collateralRate = await getRethCollateralRate();
            // Collateral rate should now be 1 (the target rate)
            assertBN.equal(collateralRate, web3.utils.toWei('1'));
        });
    });
}
