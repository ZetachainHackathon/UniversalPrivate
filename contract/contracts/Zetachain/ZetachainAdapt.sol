// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { UniversalContract, MessageContext } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import { ShieldRequest, Transaction } from "../logic/Globals.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IRailgunSmartWallet {
  function shield(ShieldRequest[] calldata _shieldRequests) external;
  function transact(Transaction[] calldata _transactions) external;
}

contract ZetachainAdapt is UniversalContract {
  IRailgunSmartWallet public immutable railgunSmartWallet;

  constructor(address _railgunSmartWallet) UniversalContract() {
    railgunSmartWallet = IRailgunSmartWallet(_railgunSmartWallet);
  }

  enum RailgunOperation {
    SHIELD,
    TRANSACT
  }

  function onCall(
    MessageContext calldata context,
    address zrc20,
    uint256 amount,
    bytes calldata message
  ) external override onlyGateway {
    (uint256 operation, bytes memory data) = abi.decode(message, (uint256, bytes));
    
    if (operation == uint256(RailgunOperation.SHIELD)) {
      ShieldRequest[] memory shieldRequests = abi.decode(data, (ShieldRequest[]));
      IERC20(zrc20).approve(address(railgunSmartWallet), amount);
      railgunSmartWallet.shield(shieldRequests);
    } else if (operation == uint256(RailgunOperation.TRANSACT)) {
      Transaction[] memory transactions = abi.decode(data, (Transaction[]));
      railgunSmartWallet.transact(transactions);
    } else {
      revert("ZetachainAdapt: Invalid operation");
    }
  }
}
