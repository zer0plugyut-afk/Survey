// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

interface IHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/// @dev Local / Sepolia rehearsal verifier. Replace with the circuit-generated Honk verifier before production whitelist.
contract MockHonkVerifier is IHonkVerifier {
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}
