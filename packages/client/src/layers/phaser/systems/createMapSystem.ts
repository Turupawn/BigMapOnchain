import { Tileset } from "../../../artTypes/world";
import { PhaserLayer } from "../createPhaserLayer";

export async function createMapSystem(layer: PhaserLayer) {
  const {
    scenes: {
      Main: {
        maps: {
          Main: { putTileAt },
        },
      },
    },
  } = layer;

  try {
    const response = await fetch('/assets/map.json');
    const data = await response.json();
    const map: number[][] = data.map;

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const coord = { x: x, y: y };
        const tileType = map[y][x];

        if (tileType === 1) {
          putTileAt(coord, Tileset.Mountain, "Foreground");
        } else {
          putTileAt(coord, Tileset.Grass, "Background");
        }
      }
    }
  } catch (error) {
    console.error("Error loading the map:", error);
  }
}