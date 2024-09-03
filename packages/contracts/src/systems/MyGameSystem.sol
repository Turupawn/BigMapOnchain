// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { System } from "@latticexyz/world/src/System.sol";
import { PlayerPosition, PlayerPositionData, Map } from "../codegen/index.sol";
import { Direction } from "../codegen/common.sol";
import { getKeysWithValue } from "@latticexyz/world-modules/src/modules/keyswithvalue/getKeysWithValue.sol";

import { EncodedLengths, EncodedLengthsLib } from "@latticexyz/store/src/EncodedLengths.sol";

contract MyGameSystem is System {
  function spawn(uint32 x, uint32 y) public {
    address player = _msgSender();
    PlayerPosition.set(player, x, y);
  }

  function move(Direction direction, bytes32 positionLeaf, bytes32[] calldata proof) public {
    require(positionLeaf == bytes32(0), "Must move to walkable area"); // 0 is grass, 1 is mountains
    address player = _msgSender();
    PlayerPositionData memory playerPosition = PlayerPosition.get(player);

    uint32 x = playerPosition.x;
    uint32 y = playerPosition.y;

    if(direction == Direction.Up)
      y-=1;
    if(direction == Direction.Down)
      y+=1;
    if(direction == Direction.Left)
      x-=1;
    if(direction == Direction.Right)
      x+=1;

    PlayerPosition.set(player, x, y);

    require(
      verifyTODO(
        positionLeaf,
        Map.getMerkleRoot(),
        proof,
        getLeafIndex(x, y)),
      "invalid proof"
    );
  }

  function verifyTODO(
    bytes32 leaf,
    bytes32 root,
    bytes32[] calldata proof,
    uint256 leafIndex
) internal pure returns (bool) {
    bytes32 computedHash = leaf;
    for (uint256 i = 0; i < proof.length; i++) {
        if (leafIndex % 2 == 0) {
            computedHash = keccak256(abi.encodePacked(computedHash, proof[i]));
        } else {
            computedHash = keccak256(abi.encodePacked(proof[i], computedHash));
        }
        leafIndex /= 2;
    }
    return computedHash == root;
}

        function getLeafIndex(uint32 x, uint32 y) public view returns (uint32) {
        // Calculate the leaf index as y * mapWidth + x
        return y * Map.getSize() + x;
    }
}