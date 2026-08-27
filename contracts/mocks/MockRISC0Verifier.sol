// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.28;

interface IRiscZeroVerifier {
    function verify(bytes calldata seal, bytes32 imageId, bytes32 journalDigest) external view;
}

/// @dev Local / Sepolia rehearsal verifier. Replace with the live RISC Zero verifier when available.
contract MockRISC0Verifier is IRiscZeroVerifier {
    function verify(bytes calldata, bytes32, bytes32) external pure {}
}
