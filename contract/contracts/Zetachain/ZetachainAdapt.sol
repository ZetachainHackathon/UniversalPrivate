// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import { UniversalContract, MessageContext } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/UniversalContract.sol";
import { ShieldRequest, Transaction } from "../logic/Globals.sol";
import { SwapHelperLib } from "@zetachain/toolkit/contracts/SwapHelperLib.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { RevertOptions } from "@zetachain/protocol-contracts/contracts/Revert.sol";
import { IGatewayZEVM } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IGatewayZEVM.sol";
import { IZRC20 } from "@zetachain/protocol-contracts/contracts/zevm/interfaces/IZRC20.sol";


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
  address public immutable uniswapRouter;
  address public immutable relayAdapt;

  constructor(address _railgunSmartWallet, address _uniswapRouter, address _relayAdapt) UniversalContract() {
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
      (bool success, bytes memory result) = railgunSmartWallet.call(transactions);
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

  }

  function withdraw(bytes memory receiver, uint256 amount, address zrc20,address targetZrc20,RevertOptions calldata revertOptions) external  {
        
    // refer from https://github.com/zeta-chain/standard-contracts/blob/main/contracts/messaging/contracts/UniversalRouter.sol
    (address gasZRC20, uint256 gasFee) = IZRC20(targetZrc20).withdrawGasFeeWithGasLimit(500000);

    uint256 swapAmount = amount;
    
    if (gasZRC20 == zrc20) {
        // 如果輸入代幣本身就是 Gas Token，直接扣除
        require(amount > gasFee, "Insufficient amount for gas");
        swapAmount = amount - gasFee;
    } else {
        // 如果輸入代幣不是 Gas Token，需要先 Swap 出 Gas 費
        uint256 inputForGas = SwapHelperLib.swapTokensForExactTokens(
            uniswapRouter,
            zrc20,
            gasFee,
            gasZRC20,
            amount
        );
        require(amount > inputForGas, "Insufficient amount for gas swap");
        swapAmount = amount - inputForGas;
    }

    // 3. 將剩下的 Token (swapAmount) 交換成目標 Token
    uint256 outputAmount;
    if (zrc20 != targetZrc20) {
        outputAmount = SwapHelperLib.swapExactTokensForTokens(
            uniswapRouter,
            zrc20,
            swapAmount,
            targetZrc20,
            0 
        );
    } else {
        // 如果輸入Token就是目標Token(且已經扣除或處理過 Gas)
        outputAmount = swapAmount;
    }


    if (gasZRC20 == targetZrc20) {
        // Gas Token就是目標Token的情況 (例如 withdraw ETH 到 Ethereum)
        // 直接approve輸出金額+Gas fee
        if (!IZRC20(gasZRC20).approve(address(gateway), outputAmount + gasFee)) {
            revert ("ZetachainAdapt: Approval failed");
        }
    } else {
        // Gas Token與目標Token不同(例如 withdraw USDC 到 Ethereum，需支付 ETH 作為 Gas)
        // 分別approve gasFee和outputAmount
        if (!IZRC20(gasZRC20).approve(address(gateway), gasFee)) {
            revert ("ZetachainAdapt: Approval failed" );
        }
        if (!IZRC20(targetZrc20).approve(address(gateway), outputAmount)) {
            revert ("ZetachainAdapt: Approval failed");
        }
    }

    // 調用 Gateway
    gateway.withdraw(
        abi.encodePacked(receiver),
        outputAmount,
        targetZrc20,
        revertOptions
    );
  }
}
