import { getComponentValue } from "@latticexyz/recs";
import { ClientComponents } from "./createClientComponents";
import { SetupNetworkResult } from "./setupNetwork";
import { singletonEntity } from "@latticexyz/store-sync/recs";

export type SystemCalls = ReturnType<typeof createSystemCalls>;

export function createSystemCalls(
  { worldContract, waitForTransaction }: SetupNetworkResult,
  { PlayerPosition }: ClientComponents,
) {
  const spawn = async (x: number, y: number) => {
    const tx = await worldContract.write.app__spawn([x, y]);
    await waitForTransaction(tx);
    return getComponentValue(PlayerPosition, singletonEntity);
  };

  const move = async (direction: number, leaf: string, proof: string[]) => {
    const tx = await worldContract.write.app__move([direction, leaf, proof]);
    await waitForTransaction(tx);
    return getComponentValue(PlayerPosition, singletonEntity);
  };

  return {
    spawn, move
  };
}