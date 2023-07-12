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
    const poolseaAuctionSettings = await PoolseaDAOProtocolSettingsAuction.deployed();
    let value = await poolseaAuctionSettings['get' + setting].call();
    return value;
}

// Deposit settings
export async function getDepositSetting(setting) {
    const poolseaDAOProtocolSettingsDeposit = await PoolseaDAOProtocolSettingsDeposit.deployed();
    let value = await poolseaDAOProtocolSettingsDeposit['get' + setting].call();
    return value;
}

// Minipool settings
export async function getMinipoolSetting(setting, preUpdate = false) {
    const poolseaDAOProtocolSettingsMinipool = preUpdate ? await PoolseaDAOProtocolSettingsMinipoolOld.deployed() : await PoolseaDAOProtocolSettingsMinipool.deployed();
    let value = await poolseaDAOProtocolSettingsMinipool['get' + setting].call();
    return value;
}

// Network settings
export async function getNetworkSetting(setting) {
    const poolseaDAOProtocolSettingsNetwork = await PoolseaDAOProtocolSettingsNetwork.deployed();
    let value = await poolseaDAOProtocolSettingsNetwork['get' + setting].call();
    return value;
}

// Node settings
export async function getNodeSetting(setting) {
    const poolseaDAOProtocolSettingsNode = await PoolseaDAOProtocolSettingsNode.deployed();
    let value = await poolseaDAOProtocolSettingsNode['get' + setting].call();
    return value;
}


