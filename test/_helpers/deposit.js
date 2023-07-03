import { PoolseaDepositPool, PoolseaDepositPoolOld } from '../_utils/artifacts';
import { upgradeExecuted } from '../_utils/upgrade';


// Get the deposit pool excess ETH balance
export async function getDepositExcessBalance() {
	const rocketDepositPool = await PoolseaDepositPool.deployed();
	let excessBalance = await rocketDepositPool.getExcessBalance.call();
	return excessBalance;
}


// Make a deposit
export async function userDeposit(txOptions) {
    const preUpdate = !(await upgradeExecuted());

    const rocketDepositPool = preUpdate ? await PoolseaDepositPoolOld.deployed() : await PoolseaDepositPool.deployed();
    await rocketDepositPool.deposit(txOptions);
}


// Assign deposits
export async function assignDeposits(txOptions) {
    const rocketDepositPool = await PoolseaDepositPool.deployed();
    await rocketDepositPool.assignDeposits(txOptions);
}

