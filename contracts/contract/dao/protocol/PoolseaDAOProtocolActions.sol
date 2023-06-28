pragma solidity 0.7.6;

// SPDX-License-Identifier: GPL-3.0-only

import "../../PoolseaBase.sol";
import "../../../interface/PoolseaVaultInterface.sol";
import "../../../interface/dao/protocol/PoolseaDAOProtocolActionsInterface.sol";


import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


// The Poolsea Pool Network DAO Actions - This is a placeholder for the network DAO to come
contract PoolseaDAOProtocolActions is PoolseaBase, PoolseaDAOProtocolActionsInterface {

    using SafeMath for uint;

    // The namespace for any data stored in the network DAO (do not change)
    string constant daoNameSpace = "dao.protocol.";


    // Construct
    constructor(PoolseaStorageInterface _poolseaStorageAddress) PoolseaBase(_poolseaStorageAddress) {
        // Version
        version = 1;
    }


    /*** Action Methods ************************/


}
