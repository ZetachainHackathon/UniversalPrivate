// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { UniversalContract, MessageContext } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import { ShieldRequest, Transaction } from "../logic/Globals.sol";
import { SwapHelperLib } from "@zetachain/toolkit/contracts/SwapHelperLib.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { RevertOptions } from "@zetachain/protocol-contracts/contracts/Revert.sol";
import { IGatewayZEVM } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import { IZRC20 } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";

event Withdraw(uint256 amount, address indexed zrc20, address indexed targetZrc20);
event Shield(uint256 amount, address indexed zrc20);

interface IRailgunSmartWallet {
  function shield(ShieldRequest[] calldata _shieldRequests) external;
  function transact(Transaction[] calldata _transactions) external;
}

contract ZetachainAdapt is UniversalContract {
  modifier onlyRelayAdapt() {
    require(msg.sender == relayAdapt, "Only relay adapt can call this function");
    _;
  }

  IRailgunSmartWallet public immutable railgunSmartWallet;
  address public immutable zetachainGateway;
  address public immutable uniswapRouter;
  address public immutable relayAdapt;

  constructor(address _railgunSmartWallet, address _zetachainGateway, address _uniswapRouter, address _relayAdapt) UniversalContract() {
    zetachainGateway = _zetachainGateway;
    railgunSmartWallet = IRailgunSmartWallet(_railgunSmartWallet);
    uniswapRouter = _uniswapRouter;
    relayAdapt = _relayAdapt;
  }

  enum RailgunOperation {
    SHIELD,
    TRANSACT,
    UNSHIELD_OUTSIDE_CHAIN
  }

  function onCall (
    MessageContext calldata context,
    address zrc20,
    uint256 amount,
    bytes calldata message
  ) external override onlyGateway {
    (uint256 operation, bytes memory data) = abi.decode(message, (uint256, bytes));
    
    if (operation == uint256(RailgunOperation.SHIELD)) {
      ShieldRequest[] memory shieldRequests = abi.decode(data, (ShieldRequest[]));

      IERC20(zrc20).approve(address(railgunSmartWallet), 0);
      IERC20(zrc20).approve(address(railgunSmartWallet), amount);

      railgunSmartWallet.shield(shieldRequests);
    } else if (operation == uint256(RailgunOperation.TRANSACT)) {
      Transaction[] memory transactions = abi.decode(data, (Transaction[]));
      railgunSmartWallet.transact(transactions);
    } else if (operation == uint256(RailgunOperation.UNSHIELD_OUTSIDE_CHAIN)) {
      bytes memory unshieldOutsideChainData = abi.decode(data, (bytes));
      (bool success, bytes memory result) = relayAdapt.call(unshieldOutsideChainData);
      if (!success) {
        // 返回詳細的錯誤信息
        if (result.length > 0) {
          // 如果有錯誤數據，直接 revert 並傳遞原始錯誤
          assembly {
            revert(add(result, 32), mload(result))
          }
        } else {
          revert("ZetachainAdapt: Unshield outside chain failed - no error data");
        }
      }
    } else {
      revert("ZetachainAdapt: Invalid operation");
    }
    emit Shield(amount, zrc20);
  }

  function withdraw(bytes memory receiver, uint256 amount, address zrc20,address targetZrc20,uint256 gasLimit,RevertOptions calldata revertOptions) external  {
        
    // refer from https://github.com/zeta-chain/standard-contracts/blob/main/contracts/messaging/contracts/UniversalRouter.sol
    (address gasZRC20, uint256 gasFee) = IZRC20(targetZrc20).withdrawGasFeeWithGasLimit(gasLimit);

    
    if (gasZRC20 != targetZrc20) {
      uint256 spent = SwapHelperLib.swapTokensForExactTokens(
            uniswapRouter,
            zrc20,
            gasFee,
            gasZRC20,
            amount
        );
      require(amount > spent, "Insufficient amount for gas fee");
      amount -= spent;
    } else {
      require(amount > gasFee, "Insufficient amount for gas fee");
      amount -= gasFee;
    }
    uint256 withdrawAmount;

    if (zrc20 != targetZrc20) {
      withdrawAmount = SwapHelperLib.swapExactTokensForTokens(
          uniswapRouter,
          zrc20,
          amount,
          targetZrc20,
          0
      );
      require(withdrawAmount > 0, "Zero output amount");
    } else {
      withdrawAmount = amount;
    }
    

    
    if (gasZRC20 == targetZrc20) {
      uint256 total = gasFee + withdrawAmount;
      IERC20(targetZrc20).approve(zetachainGateway, 0);
      IERC20(targetZrc20).approve(zetachainGateway, total);
    } else {
      IERC20(gasZRC20).approve(zetachainGateway, 0);
      IERC20(gasZRC20).approve(zetachainGateway, gasFee);

      IERC20(targetZrc20).approve(zetachainGateway, 0);
      IERC20(targetZrc20).approve(zetachainGateway, withdrawAmount);
    }
    

    

    IGatewayZEVM(zetachainGateway).withdraw(receiver,withdrawAmount,targetZrc20,revertOptions);
    emit Withdraw(withdrawAmount, zrc20, targetZrc20);
  }
}
