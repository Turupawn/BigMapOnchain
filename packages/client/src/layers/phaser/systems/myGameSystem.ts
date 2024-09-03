import { Has, defineEnterSystem, defineSystem, getComponentValueStrict } from "@latticexyz/recs";
import { PhaserLayer } from "../createPhaserLayer";
import { 
  pixelCoordToTileCoord,
  tileCoordToPixelCoord
} from "@latticexyz/phaserx";
import { TILE_WIDTH, TILE_HEIGHT, Animations, Directions } from "../constants";
import { keccak256, toUtf8Bytes, zeroPadValue } from 'ethers';

// Utils
function hashFunction(data: Uint8Array): string {
  return keccak256(data);
}

function hexStringToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Build the Merkle Tree
function buildMerkleTree(leafNodes: (number | string)[]): string {
  // Convert leaf nodes to bytes32 if they are numbers
  const processedLeafNodes = leafNodes.map(node =>
    typeof node === 'number' ? zeroPadValue("0x0"+node, 32) : node
  );
  
  let level = processedLeafNodes;
  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      const combined = new Uint8Array([
        ...hexStringToBytes(left),
        ...hexStringToBytes(right)
      ]);
      nextLevel.push(hashFunction(combined));
    }
    level = nextLevel;
  }
  return level[0];
}

// Hash the entire map
function hashMap(map: number[][]): string {
  const flatMap: (number | string)[] = map.flat();
  return buildMerkleTree(flatMap);
}

interface HashPath {
  leafHash: string;
  path: string[];  // Just hashes in the path
}

// Generate the hash path for a specific position
function generateHashPath(map: number[][], x: number, y: number): HashPath {
  const flatMap: (number | string)[] = map.flat();
  const index = y * map[0].length + x;
  const leafHash = typeof flatMap[index] === 'number'
    ? zeroPadValue("0x0"+flatMap[index], 32)
    : flatMap[index];
  const path: string[] = [];
  let level = flatMap.map(value => typeof value === 'number' ? zeroPadValue("0x0"+value, 32) : value);
  
  let currentIndex = index;

  while (level.length > 1) {
    const nextLevel: string[] = [];
    const levelLength = level.length;

    for (let i = 0; i < levelLength; i += 2) {
      const left = level[i];
      const right = i + 1 < levelLength ? level[i + 1] : left;
      const combined = new Uint8Array([
        ...hexStringToBytes(left),
        ...hexStringToBytes(right)
      ]);
      const parentHash = hashFunction(combined);
      nextLevel.push(parentHash);

      if (i === currentIndex || i + 1 === currentIndex) {
        const siblingIndex = i === currentIndex ? i + 1 : i;
        path.push(level[siblingIndex]); // Store only the hash
        currentIndex = Math.floor(currentIndex / 2); // Move up to the parent index
      }
    }
    level = nextLevel;
  }

  return { leafHash, path };
}

export const createMyGameSystem = (layer: PhaserLayer) => {
  const {
    world,
    networkLayer: {
      components: {
        PlayerPosition,
      },
      systemCalls: {
        spawn,
        move,
      }
    },
    scenes: {
        Main: {
            objectPool,
            input
        }
    }
  } = layer;

  let myPosition = {x: 0, y: 0};
  let map: number[][];

  const loadMap = async () => {
    try {
      const response = await fetch('/assets/map.json');
      const data = await response.json();
      map = data.map;
      console.log("Map loaded");

      const mapHash = hashMap(map);
      console.log('Map Hash (Merkle Root):', mapHash);

    } catch (error) {
      console.error("Error loading the map:", error);
    }
  };

  loadMap();

  input.pointerdown$.subscribe((event) => {
    const x = event.pointer.worldX;
    const y = event.pointer.worldY;
    const playerPosition = pixelCoordToTileCoord({ x, y }, TILE_WIDTH, TILE_HEIGHT);
    console.log(playerPosition)
    if(playerPosition.x == 0 && playerPosition.y == 0)
        return;
    spawn(playerPosition.x, playerPosition.y) 
  });

  input.onKeyPress((keys) => keys.has("W"), () => {
    const path = generateHashPath(map, myPosition.x, myPosition.y-1);
    const proof = path.path.map(hash => `0x${hash.slice(2)}`);

    console.log(path.leafHash)
    if(path.leafHash == "0x0000000000000000000000000000000000000000000000000000000000000000") // Update only if walking in grass
    {
        myPosition.y -= 1;
    }
    //console.log('Leaf Hash:', path.leafHash);
    //console.log('Leaf Index:', myPosition.y * map[0].length + myPosition.x);
    //console.log('Proof:', JSON.stringify(proof));

    move(Directions.UP, path.leafHash, proof);
  });

  input.onKeyPress((keys) => keys.has("S"), () => {
    const path = generateHashPath(map, myPosition.x, myPosition.y+1);
    const proof = path.path.map(hash => `0x${hash.slice(2)}`);

    if(path.leafHash == "0x0000000000000000000000000000000000000000000000000000000000000000") // Update only if walking in grass
    {
        myPosition.y += 1;
    }

    move(Directions.DOWN, path.leafHash, proof);
  });

  input.onKeyPress((keys) => keys.has("A"), () => {
    const path = generateHashPath(map, myPosition.x-1, myPosition.y);
    const proof = path.path.map(hash => `0x${hash.slice(2)}`);

    if(path.leafHash == "0x0000000000000000000000000000000000000000000000000000000000000000") // Update only if walking in grass
    {
        myPosition.x -= 1;
    }
    move(Directions.LEFT, path.leafHash, proof);
  });

  input.onKeyPress((keys) => keys.has("D"), () => {
    const path = generateHashPath(map, myPosition.x+1, myPosition.y);
    const proof = path.path.map(hash => `0x${hash.slice(2)}`);

    if(path.leafHash == "0x0000000000000000000000000000000000000000000000000000000000000000") // Update only if walking in grass
    {
        myPosition.x += 1;
    }

    move(Directions.RIGHT, path.leafHash, proof);
  });

  defineEnterSystem(world, [Has(PlayerPosition)], ({entity}) => {
    const playerObj = objectPool.get(entity, "Sprite");
    playerObj.setComponent({
        id: 'animation',
        once: (sprite) => {
            sprite.play(Animations.Player);
        }
    })
  });

  defineSystem(world, [Has(PlayerPosition)], ({ entity }) => {
    const playerPosition = getComponentValueStrict(PlayerPosition, entity);
    myPosition = playerPosition;
    const pixelPosition = tileCoordToPixelCoord(playerPosition, TILE_WIDTH, TILE_HEIGHT);

    const playerObj = objectPool.get(entity, "Sprite");

    playerObj.setComponent({
      id: "position",
      once: (sprite) => {
        sprite.setPosition(pixelPosition.x, pixelPosition.y);
      }
    })
  })
};