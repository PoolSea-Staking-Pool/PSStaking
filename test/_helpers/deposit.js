import { PoolseaDepositPool, PoolseaDepositPoolOld } from '../_utils/artifacts';
import { upgradeExecuted } from '../_utils/upgrade';


// Get the deposit pool excess ETH balance
export async function getDepositExcessBalance() {
	const poolseaDepositPool = await PoolseaDepositPool.deployed();
	let excessBalance = await poolseaDepositPool.getExcessBalance.call();
	return excessBalance;
}


// Make a deposit
export async function userDeposit(txOptions) {
    const preUpdate = !(await upgradeExecuted());

    const poolseaDepositPool = preUpdate ? await PoolseaDepositPoolOld.deployed() : await PoolseaDepositPool.deployed();
    await poolseaDepositPool.deposit(txOptions);
}


// Assign deposits
export async function assignDeposits(txOptions) {
    const poolseaDepositPool = await PoolseaDepositPool.deployed();
    await poolseaDepositPool.assignDeposits(txOptions);
}

