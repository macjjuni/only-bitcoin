import {
  COMMANDER_ATLAS_FRAMES,
  COMMANDER_ATLAS_IMAGE_PATH,
  type CommanderAtlasFrame,
  type CommanderId,
} from "../model/commanderSprites";

export interface CommanderSpriteAtlas {
  getSprite: (commanderId: CommanderId) => CommanderAtlasFrame;
  image: HTMLImageElement;
}

let commanderAtlasLoadPromise: Promise<CommanderSpriteAtlas> | null = null;

function loadCommanderAtlasImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const atlasImage = new Image();
    atlasImage.onload = () => resolve(atlasImage);
    atlasImage.onerror = () =>
      reject(new Error(`커맨더 아틀라스 로드 실패: ${COMMANDER_ATLAS_IMAGE_PATH}`));
    atlasImage.src = COMMANDER_ATLAS_IMAGE_PATH;
  });
}

export function loadCommanderSpriteAtlas(): Promise<CommanderSpriteAtlas> {
  if (commanderAtlasLoadPromise !== null) {
    return commanderAtlasLoadPromise;
  }

  commanderAtlasLoadPromise = loadCommanderAtlasImage()
    .then((image) => ({
      image,
      getSprite: (commanderId: CommanderId): CommanderAtlasFrame =>
        COMMANDER_ATLAS_FRAMES[commanderId],
    }))
    .catch((loadError: unknown) => {
      commanderAtlasLoadPromise = null;
      throw loadError;
    });

  return commanderAtlasLoadPromise;
}
