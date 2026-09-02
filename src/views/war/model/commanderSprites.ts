import type { TradeSide } from "@/entities/order-flow";

export const COMMANDER_ATLAS_IMAGE_PATH = "/images/war/commander-atlas.png";

export const COMMANDER_ATLAS_WIDTH_IN_PX = 1536;
export const COMMANDER_ATLAS_HEIGHT_IN_PX = 1024;

export type CommanderId =
  | "michaelSaylor"
  | "cathieWood"
  | "jackDorsey"
  | "peterSchiff"
  | "billGates"
  | "warrenBuffett";

export interface CommanderAtlasFrame {
  xInPx: number;
  yInPx: number;
  widthInPx: number;
  heightInPx: number;
}

const COMMANDER_CELL_WIDTH_IN_PX = COMMANDER_ATLAS_WIDTH_IN_PX / 3;
const COMMANDER_CELL_HEIGHT_IN_PX = COMMANDER_ATLAS_HEIGHT_IN_PX / 2;

export const COMMANDER_ATLAS_FRAMES: Record<CommanderId, CommanderAtlasFrame> = {
  michaelSaylor: {
    xInPx: 0,
    yInPx: 0,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
  cathieWood: {
    xInPx: COMMANDER_CELL_WIDTH_IN_PX,
    yInPx: 0,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
  jackDorsey: {
    xInPx: COMMANDER_CELL_WIDTH_IN_PX * 2,
    yInPx: 0,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
  peterSchiff: {
    xInPx: 0,
    yInPx: COMMANDER_CELL_HEIGHT_IN_PX,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
  billGates: {
    xInPx: COMMANDER_CELL_WIDTH_IN_PX,
    yInPx: COMMANDER_CELL_HEIGHT_IN_PX,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
  warrenBuffett: {
    xInPx: COMMANDER_CELL_WIDTH_IN_PX * 2,
    yInPx: COMMANDER_CELL_HEIGHT_IN_PX,
    widthInPx: COMMANDER_CELL_WIDTH_IN_PX,
    heightInPx: COMMANDER_CELL_HEIGHT_IN_PX,
  },
};

const BUY_COMMANDERS: CommanderId[] = ["michaelSaylor", "cathieWood", "jackDorsey"];
const SELL_COMMANDERS: CommanderId[] = ["peterSchiff", "billGates", "warrenBuffett"];

export function getCommanderForTrade(side: TradeSide, sequenceIndex: number): CommanderId {
  const commanderList = side === "buy" ? BUY_COMMANDERS : SELL_COMMANDERS;
  return commanderList[sequenceIndex % commanderList.length];
}
