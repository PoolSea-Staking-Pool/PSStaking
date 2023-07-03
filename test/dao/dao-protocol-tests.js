import { printTitle } from '../_utils/formatting';
import { shouldRevert } from '../_utils/testing';
import {
  setDAOProtocolBootstrapSetting,
  setDaoProtocolBootstrapModeDisabled,
  setDAOProtocolBootstrapSettingMulti
} from './scenario-dao-protocol-bootstrap'

// Contracts
import { PoolseaDAOProtocolSettingsAuction, PoolseaDAOProtocolSettingsDeposit, PoolseaDAOProtocolSettingsInflation, PoolseaDAOProtocolSettingsMinipool, PoolseaDAOProtocolSettingsNetwork, PoolseaDAOProtocolSettingsRewards } from '../_utils/artifacts';
import { upgradeOneDotTwo } from '../_utils/upgrade';


export default function() {
    contract('RocketDAOProtocol', async (accounts) => {

        // Accounts
        const [
            guardian,
            userOne
        ] = accounts;


        // Setup - This is a WIP DAO, onlyGuardians will be able to change settings before the DAO is officially rolled out
        before(async () => {
            await upgradeOneDotTwo(guardian);
        });


        //
        // Start Tests
        //

        // Update a setting
        it(printTitle('userOne', 'fails to update a setting as they are not the guardian'), async () => {
            // Fails to change a setting
            await shouldRevert(setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsAuction, 'auction.lot.create.enabled', true, {
                from: userOne,
            }), "User updated bootstrap setting", "Account is not a temporary guardian");

        });

        // Update multiple settings
        it(printTitle('userOne', 'fails to update multiple settings as they are not the guardian'), async () => {
          // Fails to change multiple settings
          await shouldRevert(setDAOProtocolBootstrapSettingMulti([
                PoolseaDAOProtocolSettingsAuction,
                PoolseaDAOProtocolSettingsDeposit,
                PoolseaDAOProtocolSettingsInflation
              ],
              [
                'auction.lot.create.enabled',
                'deposit.minimum',
                'rpl.inflation.interval.blocks'
              ],
              [
                true,
                web3.utils.toWei('2'),
                400
              ],
              {
                from: userOne
              }), "User updated bootstrap setting", "Account is not a temporary guardian");
        });

        // Verify each setting contract is enabled correctly. These settings are tested in greater detail in the relevent contracts
        it(printTitle('guardian', 'updates a setting in each settings contract while bootstrap mode is enabled'), async () => {
            // Set via bootstrapping
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsAuction, 'auction.lot.create.enabled', true, {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsDeposit, 'deposit.minimum', web3.utils.toWei('2'), {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsInflation, 'rpl.inflation.interval.blocks', 400, {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsMinipool, 'minipool.submit.withdrawable.enabled', true, {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsNetwork, 'network.submit.prices.enabled', true, {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsRewards, 'rpl.rewards.claim.period.blocks', 100, {
                from: guardian
            });
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsInflation, 'network.reth.deposit.delay', 500, {
                from: guardian
            });
        });

      // Verify each setting contract is enabled correctly. These settings are tested in greater detail in the relevent contracts
      it(printTitle('guardian', 'updates multiple settings at once while bootstrap mode is enabled'), async () => {
        // Set via bootstrapping
        await setDAOProtocolBootstrapSettingMulti([
            PoolseaDAOProtocolSettingsAuction,
            PoolseaDAOProtocolSettingsDeposit,
            PoolseaDAOProtocolSettingsInflation
          ],
          [
            'auction.lot.create.enabled',
            'deposit.minimum',
            'rpl.inflation.interval.blocks'
          ],
          [
            true,
            web3.utils.toWei('2'),
            400
          ],
          {
          from: guardian
        });
      });

      // Update a setting, then try again
      it(printTitle('guardian', 'updates a setting, then fails to update a setting again after bootstrap mode is disabled'), async () => {
            // Set via bootstrapping
            await setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsAuction, 'auction.lot.create.enabled', true, {
                from: guardian
            });
            // Disable bootstrap mode
            await setDaoProtocolBootstrapModeDisabled({
                from: guardian
            });
            // Attempt to change a setting again
            await shouldRevert(setDAOProtocolBootstrapSetting(PoolseaDAOProtocolSettingsAuction, 'auction.lot.create.enabled', true, {
                from: guardian,
            }), "Guardian updated bootstrap setting after mode disabled", "Bootstrap mode not engaged");

        });

        // Update multiple settings, then try again
        it(printTitle('guardian', 'updates multiple settings, then fails to update multiple settings again after bootstrap mode is disabled'), async () => {
          // Set via bootstrapping
          await setDAOProtocolBootstrapSettingMulti([
              PoolseaDAOProtocolSettingsAuction,
              PoolseaDAOProtocolSettingsDeposit,
              PoolseaDAOProtocolSettingsInflation
            ],
            [
              'auction.lot.create.enabled',
              'deposit.minimum',
              'rpl.inflation.interval.blocks'
            ],
            [
              true,
              web3.utils.toWei('2'),
              400
            ],
            {
              from: guardian
            });
            // Disable bootstrap mode
            await setDaoProtocolBootstrapModeDisabled({
              from: guardian
            });
            // Attempt to change a setting again
            await shouldRevert(setDAOProtocolBootstrapSettingMulti([
                PoolseaDAOProtocolSettingsAuction,
                PoolseaDAOProtocolSettingsDeposit,
                PoolseaDAOProtocolSettingsInflation
              ],
              [
                'auction.lot.create.enabled',
                'deposit.minimum',
                'rpl.inflation.interval.blocks'
              ],
              [
                true,
                web3.utils.toWei('2'),
                400
              ],
              {
                from: guardian
              }), "Guardian updated bootstrap setting after mode disabled", "Bootstrap mode not engaged");

        });


    });
}
