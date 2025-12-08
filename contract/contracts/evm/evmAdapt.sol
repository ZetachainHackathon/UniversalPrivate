// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;


import { IGatewayEVM } from "@zetachain/protocol-contracts/contracts/evm/interfaces/IGatewayEVM.sol";
import { ShieldRequest, Transaction } from "../logic/Globals.sol";
import { RevertOptions } from "@zetachain/protocol-contracts/contracts/Revert.sol";

contract EVMAdapt  {
    IGatewayEVM public immutable gatewayEVM;
    address public immutable zetachainAdapt;
    
    enum RailgunOperation {
        SHIELD,
        TRANSACT
    }
    function _defaultRevertOptions() internal pure returns (RevertOptions memory) {
        return RevertOptions({ 
            revertAddress: address(0),   
            callOnRevert: false,        
            abortAddress: address(0),   
            revertMessage: "",          
            onRevertGasLimit: 0         
        });
    }

    constructor(address _gatewayEVM, address _zetachainAdapt) {
        require(_gatewayEVM != address(0), "zero gateway");
        require(_zetachainAdapt != address(0), "zero zeta adapt");
        gatewayEVM = IGatewayEVM(_gatewayEVM);
        zetachainAdapt = _zetachainAdapt;
    }
    
    function shieldOnZetachain(ShieldRequest[] calldata _shieldRequests) external payable {
        RevertOptions memory revertOptions = _defaultRevertOptions();
        bytes memory message = abi.encode(
            uint256(RailgunOperation.SHIELD),
            abi.encode(_shieldRequests)
        );
        gatewayEVM.depositAndCall{value: msg.value}(zetachainAdapt, message, revertOptions);
    }

    
}