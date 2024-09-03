import { defineWorld } from "@latticexyz/world";

export default defineWorld({
  namespace: "app",
  enums: {
    Direction: [
      "Up",
      "Down",
      "Left",
      "Right"
    ]
  },
  tables: {
    PlayerPosition: {
      schema: {
        player: "address",
        x: "uint32",
        y: "uint32",
      },
      key: ["player"]
    },
    Map: {
      schema: {
        merkleRoot: "bytes32",
        size: "uint32"
      },
      key: [],
    },
  },
});