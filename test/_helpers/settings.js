import {
    PoolseaDAOProtocolSettingsAuction,
    PoolseaDAOProtocolSettingsDeposit,
    PoolseaDAOProtocolSettingsMinipool,
    PoolseaDAOProtocolSettingsMinipoolOld,
    PoolseaDAOProtocolSettingsNetwork,
    PoolseaDAOProtocolSettingsNode,
} from '../_utils/artifacts';


// Auction settings
export async function getAuctionSetting(setting) {
    const rocketAuctionSettings = await PoolseaDAOProtocolSettingsAuction.deployed();
    let value = await rocketAuctionSettings['get' + setting].call();
    return value;
}

// Deposit settings
export async function getDepositSetting(setting) {
    const rocketDAOProtocolSettingsDeposit = await PoolseaDAOProtocolSettingsDeposit.deployed();
    let value = await rocketDAOProtocolSettingsDeposit['get' + setting].call();
    return value;
}

// Minipool settings
export async function getMinipoolSetting(setting, preUpdate = false) {
    const rocketDAOProtocolSettingsMinipool = preUpdate ? await PoolseaDAOProtocolSettingsMinipoolOld.deployed() : await PoolseaDAOProtocolSettingsMinipool.deployed();
    let value = await rocketDAOProtocolSettingsMinipool['get' + setting].call();
    return value;
}

// Network settings
export async function getNetworkSetting(setting) {
    const rocketDAOProtocolSettingsNetwork = await PoolseaDAOProtocolSettingsNetwork.deployed();
    let value = await rocketDAOProtocolSettingsNetwork['get' + setting].call();
    return value;
}

// Node settings
export async function getNodeSetting(setting) {
    const rocketDAOProtocolSettingsNode = await PoolseaDAOProtocolSettingsNode.deployed();
    let value = await rocketDAOProtocolSettingsNode['get' + setting].call();
    return value;
}


