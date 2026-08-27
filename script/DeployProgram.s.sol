// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;
import { Script, console2 } from "forge-std/Script.sol";
import { SurveyProgram, IRiscZeroVerifier, IHonkVerifier } from "../contracts/SurveyProgram.sol";
import { ImageID } from "../contracts/ImageID.sol";
import { IInterfold } from "@interfold/contracts/contracts/interfaces/IInterfold.sol";

contract DeployProgram is Script {
    function run() external {
        address interfold = vm.envAddress("INTERFOLD_ADDRESS");
        address risc0 = vm.envAddress("RISC0_VERIFIER_ADDRESS");
        address honk = vm.envAddress("HONK_VERIFIER_ADDRESS");
        bytes32 imageId = ImageID.PROGRAM_ID;
        vm.startBroadcast();
        SurveyProgram program = new SurveyProgram(
            IInterfold(interfold),
            IRiscZeroVerifier(risc0),
            IHonkVerifier(honk),
            imageId
        );
        vm.stopBroadcast();
        console2.log("INTERFOLD", interfold);
        console2.log("RISC0_VERIFIER", risc0);
        console2.log("HONK_VERIFIER", honk);
        console2.log("IMAGE_ID");
        console2.logBytes32(imageId);
        console2.log("E3_PROGRAM", address(program));
    }
}
