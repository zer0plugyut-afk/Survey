// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity 0.8.28;

import { IE3Program } from "@interfold/contracts/contracts/interfaces/IE3Program.sol";
import { IInterfold } from "@interfold/contracts/contracts/interfaces/IInterfold.sol";
import { E3 } from "@interfold/contracts/contracts/interfaces/IE3.sol";
import { Risc0ComputeProof } from "@interfold/contracts/contracts/lib/Risc0ComputeProof.sol";
import { LazyIMTData, InternalLazyIMT } from "@zk-kit/lazy-imt.sol/InternalLazyIMT.sol";

interface IRiscZeroVerifier {
    function verify(bytes calldata seal, bytes32 imageId, bytes32 journalDigest) external view;
}

/// @notice Honk verifier for the survey_fold circuit (encryption + allowed-value constraints).
interface IHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/**
 * @title SurveyProgram
 * @notice Privacy-preserving education survey as an InterFold E3 program.
 * @dev Each `publishInput` carries a Honk proof from the **survey_fold** circuit
 *      (CRISP-style: `user_data_encryption_*` + survey app + fold).
 *      `validate` is callable only by InterFold. `publishInput` binds the answer to
 *      `msg.sender` and emits the ciphertext for data availability.
 */
contract SurveyProgram is IE3Program {
    using InternalLazyIMT for LazyIMTData;

    bytes32 public constant ENCRYPTION_SCHEME_ID = keccak256("fhe.rs:BFV");
    bytes32 public constant SCHEMA_ID = keccak256("education-survey-v1");
    uint8 public constant TREE_DEPTH = 20;
    /// @dev Max question slots (CRISP packing + circuit). Surveys may use fewer (2–20).
    uint256 public constant QUESTION_COUNT = 20;
    uint256 public constant LIKERT_MIN = 1;
    uint256 public constant LIKERT_MAX = 5;
    uint256 public constant YESNO_MIN = 0;
    uint256 public constant YESNO_MAX = 1;

    /// @dev Public-input layout for survey_fold (must match Noir fold pubs + return).
    /// 0 schemaId, 1 respondent, 2 questionIndex, 3 min, 4 max,
    /// 5 ciphertextCommitment, 6 committee pk commitment (fold return).
    uint256 public constant PI_SCHEMA = 0;
    uint256 public constant PI_RESPONDENT = 1;
    uint256 public constant PI_QUESTION = 2;
    uint256 public constant PI_MIN = 3;
    uint256 public constant PI_MAX = 4;
    uint256 public constant PI_COMMITMENT = 5;
    uint256 public constant PI_COMMITTEE_KEY = 6;
    uint256 public constant PI_LENGTH = 7;

    IInterfold public immutable interfold;
    IRiscZeroVerifier public immutable risc0Verifier;
    IHonkVerifier public immutable inputVerifier;
    bytes32 public immutable imageId;

    mapping(uint256 e3Id => bytes32 paramsHash) public paramsHashes;
    mapping(uint256 e3Id => LazyIMTData) internal inputs;
    mapping(uint256 e3Id => mapping(bytes32 leaf => bool)) public publishedLeaves;

    error CallerNotAuthorized();
    error E3AlreadyInitialized();
    error E3DoesNotExist();
    error VerifierAddressZero();
    error EmptyInputData();
    error InputDeadlineReached();
    error InputWindowNotOpen();
    error KeyNotPublished();
    error InvalidQuestionIndex();
    error InvalidInputProof();
    error InputAlreadyPublished();
    error InvalidComputeContext();
    error ZeroAddress();
    error RespondentMismatch();
    error InvalidAnswerRange();

    event SurveyRoundInitialized(uint256 indexed e3Id, bytes32 paramsHash, bytes32 schemaId);
    event SurveyAnswerPublished(
        uint256 indexed e3Id,
        address indexed respondent,
        uint256 questionIndex,
        bytes32 ciphertextCommitment,
        bytes ciphertext,
        uint40 leafIndex
    );

    constructor(
        IInterfold _interfold,
        IRiscZeroVerifier _risc0Verifier,
        IHonkVerifier _inputVerifier,
        bytes32 _imageId
    ) {
        if (address(_interfold) == address(0)) revert ZeroAddress();
        if (address(_risc0Verifier) == address(0)) revert VerifierAddressZero();
        if (address(_inputVerifier) == address(0)) revert VerifierAddressZero();

        interfold = _interfold;
        risc0Verifier = _risc0Verifier;
        inputVerifier = _inputVerifier;
        imageId = _imageId;
    }

    /// @inheritdoc IE3Program
    function validate(
        uint256 e3Id,
        uint256,
        bytes calldata e3ProgramParams,
        bytes calldata,
        bytes calldata
    ) external returns (bytes32) {
        if (msg.sender != address(interfold)) revert CallerNotAuthorized();
        if (paramsHashes[e3Id] != bytes32(0)) revert E3AlreadyInitialized();

        bytes32 paramsHash = keccak256(e3ProgramParams);
        paramsHashes[e3Id] = paramsHash;
        inputs[e3Id]._init(TREE_DEPTH);

        emit SurveyRoundInitialized(e3Id, paramsHash, SCHEMA_ID);
        return ENCRYPTION_SCHEME_ID;
    }

    /**
     * @notice Submit one encrypted survey answer with a Honk proof of encryption + allowed value.
     * @param e3Id Round id.
     * @param data abi.encode(bytes proof, address respondent, uint256 questionIndex,
     *             uint256 minValue, uint256 maxValue, bytes32 ciphertextCommitment, bytes ciphertext)
     * @dev `respondent` in `data` must equal `msg.sender` (sybil bind for v1).
     *      `(minValue, maxValue)` must be a supported pair: Likert `(1,5)` or yes/no `(0,1)`.
     *      Any slot `0 .. QUESTION_COUNT-1` may use either pair (creator chooses per question).
     */
    function publishInput(uint256 e3Id, bytes memory data) external {
        if (paramsHashes[e3Id] == bytes32(0)) revert E3DoesNotExist();

        if (interfold.getE3Stage(e3Id) != IInterfold.E3Stage.KeyPublished) {
            revert KeyNotPublished();
        }

        E3 memory e3 = interfold.getE3(e3Id);

        if (block.timestamp > e3.inputWindow[1]) revert InputDeadlineReached();
        if (block.timestamp < e3.inputWindow[0]) revert InputWindowNotOpen();

        (
            bytes memory proof,
            address respondent,
            uint256 questionIndex,
            uint256 minValue,
            uint256 maxValue,
            bytes32 ciphertextCommitment,
            bytes memory ciphertext
        ) = abi.decode(data, (bytes, address, uint256, uint256, uint256, bytes32, bytes));

        if (respondent != msg.sender) revert RespondentMismatch();
        if (ciphertext.length == 0 || ciphertextCommitment == bytes32(0)) revert EmptyInputData();
        if (questionIndex >= QUESTION_COUNT) revert InvalidQuestionIndex();
        if (!isAllowedRange(minValue, maxValue)) revert InvalidAnswerRange();

        bytes32[] memory publicInputs = new bytes32[](PI_LENGTH);
        publicInputs[PI_SCHEMA] = SCHEMA_ID;
        publicInputs[PI_RESPONDENT] = bytes32(uint256(uint160(respondent)));
        publicInputs[PI_QUESTION] = bytes32(questionIndex);
        publicInputs[PI_MIN] = bytes32(minValue);
        publicInputs[PI_MAX] = bytes32(maxValue);
        publicInputs[PI_COMMITMENT] = ciphertextCommitment;
        publicInputs[PI_COMMITTEE_KEY] = e3.committeePublicKey;

        if (!inputVerifier.verify(proof, publicInputs)) revert InvalidInputProof();

        bytes32 leaf = keccak256(
            abi.encodePacked(ciphertextCommitment, respondent, questionIndex, SCHEMA_ID)
        );
        if (publishedLeaves[e3Id][leaf]) revert InputAlreadyPublished();
        publishedLeaves[e3Id][leaf] = true;

        uint40 leafIndex = inputs[e3Id].numberOfLeaves;
        inputs[e3Id]._insert(uint256(ciphertextCommitment));

        emit SurveyAnswerPublished(
            e3Id, respondent, questionIndex, ciphertextCommitment, ciphertext, leafIndex
        );
    }

    /// @inheritdoc IE3Program
    function verify(
        uint256 e3Id,
        bytes32 ciphertextOutputHash,
        bytes32 ciphertextCommitment,
        bytes memory proof
    ) external view returns (bool) {
        if (paramsHashes[e3Id] == bytes32(0)) revert E3DoesNotExist();

        E3 memory e3 = interfold.getE3(e3Id);

        bytes32 paramsHash = paramsHashes[e3Id];
        bytes32 inputRoot = bytes32(inputs[e3Id]._root());

        Risc0ComputeProof.Proof memory computeProof = Risc0ComputeProof.decode(proof);
        if (computeProof.paramsHash != paramsHash || computeProof.inputRoot != inputRoot) {
            revert InvalidComputeContext();
        }

        bytes memory journal = Risc0ComputeProof.journal(
            bytes32(block.chainid),
            bytes32(uint256(uint160(address(interfold)))),
            bytes32(e3Id),
            e3.encryptionSchemeId,
            e3.committeePublicKey,
            ciphertextOutputHash,
            ciphertextCommitment,
            paramsHash,
            inputRoot
        );

        risc0Verifier.verify(computeProof.seal, imageId, sha256(journal));
        return true;
    }

    /// @notice True if `(min,max)` is Likert `(1,5)` or yes/no `(0,1)`.
    function isAllowedRange(uint256 minValue, uint256 maxValue) public pure returns (bool) {
        return (minValue == LIKERT_MIN && maxValue == LIKERT_MAX)
            || (minValue == YESNO_MIN && maxValue == YESNO_MAX);
    }

    /// @notice Range for a question kind: `0` = Likert 1–5, `1` = yes/no 0–1.
    function allowedRangeForKind(uint8 kind) public pure returns (uint256 minValue, uint256 maxValue) {
        if (kind == 0) return (LIKERT_MIN, LIKERT_MAX);
        if (kind == 1) return (YESNO_MIN, YESNO_MAX);
        revert InvalidAnswerRange();
    }

    function inputRootOf(uint256 e3Id) external view returns (bytes32) {
        if (paramsHashes[e3Id] == bytes32(0)) revert E3DoesNotExist();
        return bytes32(inputs[e3Id]._root());
    }

    function inputCount(uint256 e3Id) external view returns (uint40) {
        if (paramsHashes[e3Id] == bytes32(0)) revert E3DoesNotExist();
        return inputs[e3Id].numberOfLeaves;
    }
}
