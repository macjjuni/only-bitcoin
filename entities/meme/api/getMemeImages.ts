import { env } from "@/shared/config/env";
import { shuffleArray } from "@/shared/utils/common";
import type { MemeImageResponseData } from "../model/types";

export const getMemeImages = async (): Promise<MemeImageResponseData[]> => {
  try {
    const baseUrl = env.NEXT_PUBLIC_MEME_IMAGE_URL;
    if (!baseUrl) {
      console.warn("NEXT_PUBLIC_MEME_IMAGE_URL is empty or undefined.");
      return [];
    }

    const url = `${baseUrl}/meme.json`;
    console.log(url);
    const response = await fetch(url, {
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
