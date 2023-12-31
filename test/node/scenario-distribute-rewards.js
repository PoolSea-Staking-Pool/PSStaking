import {
  PoolseaMinipoolDelegate, PoolseaMinipoolManager,
  PoolseaNodeDistributorDelegate,
  PoolseaNodeDistributorFactory, PoolseaNodeManager,
  PoolseaStorage,
  PoolseaTokenRPLS
} from '../_utils/artifacts';
import { assertBN } from '../_helpers/bn';


export async function distributeRewards(nodeAddress, txOptions) {
  // Get contracts
  const poolseaStorage = await PoolseaStorage.deployed();
  const poolseaNodeDistributorFactory = await PoolseaNodeDistributorFactory.deployed();
  const distributorAddress = await poolseaNodeDistributorFactory.getProxyAddress(nodeAddress);
  const distributor = await PoolseaNodeDistributorDelegate.at(distributorAddress);
  const poolseaTokenRETH = await PoolseaTokenRPLS.deployed();
  const poolseaMinipoolManager = await PoolseaMinipoolManager.deployed();
  const poolseaNodeManager = await PoolseaNodeManager.deployed();
  // Get node withdrawal address
  const withdrawalAddress = await poolseaStorage.getNodeWithdrawalAddress(nodeAddress);
  // Get distributor contract balance
  const distributorBalance = new web3.utils.BN(await web3.eth.getBalance(distributorAddress));
  // Get nodes average fee
  const minipoolCount = new web3.utils.BN(await poolseaMinipoolManager.getNodeMinipoolCount(nodeAddress)).toNumber();

  async function getMinipoolDetails(index) {
    const minipoolAddress = await poolseaMinipoolManager.getNodeMinipoolAt(nodeAddress, index);
    const minipool = await PoolseaMinipoolDelegate.at(minipoolAddress)
    return Promise.all([
      minipool.getStatus(),
      minipool.getNodeFee()
    ]).then(
      ([status, fee]) => ({
        status: new web3.utils.BN(status),
        fee: new web3.utils.BN(fee)
      })
    )
  }

  // Get status and node fee of each minipool
  const minipoolDetails = await Promise.all([...Array(minipoolCount).keys()].map(i => getMinipoolDetails(i)))

  let numerator = new web3.utils.BN(0);
  let denominator = new web3.utils.BN(0);

  for (const minipoolDetail of minipoolDetails) {
    if (minipoolDetail.status.toNumber() === 2){ // Staking
      numerator = numerator.add(minipoolDetail.fee);
      denominator = denominator.add(new web3.utils.BN(1));
    }
  }

  let expectedAverageFee = new web3.utils.BN(0);

  if (!numerator.eq(expectedAverageFee)){
    expectedAverageFee = numerator.div(denominator);
  }

  // Query average fee from contracts
  const averageFee = new web3.utils.BN(await poolseaNodeManager.getAverageNodeFee(nodeAddress));
  assert.strictEqual(averageFee.toString(), expectedAverageFee.toString(), 'Incorrect average node fee');

  // Calculate expected node and user amounts from average fee
  const halfAmount = distributorBalance.div(new web3.utils.BN(2));
  const expectedNodeAmount = halfAmount.add(halfAmount.mul(averageFee).div(new web3.utils.BN('1'.ether)));
  const expectedUserAmount = distributorBalance.sub(expectedNodeAmount);

  async function getBalances() {
    return Promise.all([
      web3.eth.getBalance(withdrawalAddress),
      web3.eth.getBalance(poolseaTokenRETH.address),
    ]).then(
      ([nodeEth, userEth]) =>
        ({
          nodeEth: new web3.utils.BN(nodeEth),
          userEth: new web3.utils.BN(userEth)
        })
    );
  }

  // Get balance before distribute
  const balances1 = await getBalances();
  // Call distributor
  await distributor.distribute();
  // Get balance after distribute
  const balances2 = await getBalances();
  // Check results
  const nodeEthChange = balances2.nodeEth.sub(balances1.nodeEth);
  const userEthChange = balances2.userEth.sub(balances1.userEth);
  assertBN.equal(nodeEthChange, expectedNodeAmount, 'Node ETH balance not correct');
  assertBN.equal(userEthChange, expectedUserAmount, 'User ETH balance not correct');
}
