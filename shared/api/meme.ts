import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import { shuffleArray } from "@/shared/utils/common";
import { env } from "@/shared/config/env";

const MEME_IMAGE_API_URL = `${env.NEXT_PUBLIC_MEME_IMAGE_URL}/meme.json`;


export const getMemeImages = async (): Promise<MemeImageResponseData[]> => {
  try {
    console.log(MEME_IMAGE_API_URL);
    const response = await fetch(MEME_IMAGE_API_URL, {
      next: { revalidate: 3600 * 3 }, // 3시간 동안 캐시
    });

    if (!response.ok) return [];

    const data: MemeImageResponseData[] = await response.json();
    return shuffleArray(data);
  } catch (error) {
    console.error(error);
    return [];
  }
};
