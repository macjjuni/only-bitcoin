import { useQuery } from '@tanstack/react-query';
import { MemeImageResponseData } from '@/shared/types/api/memeImage';
import fetcher from "@/shared/utils/fetcher";
import { isDev, shuffleArray } from "@/shared/utils/common";

const MEME_IMAGE_API_URL =
  'https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/main/public/images/meme.json';


const fetchMemeImages = async (): Promise<MemeImageResponseData[]> => {

  try {
    const data = await fetcher<MemeImageResponseData[]>(MEME_IMAGE_API_URL);

    if (isDev) { console.log("✅ 공포 탐욕 지수 데이터 초기화!"); }
    return shuffleArray(data);

  } catch {
    return [];
  }
};


function useMemeImages() {

  const { data: images, ...restData }  = useQuery({
    queryKey: ['meme-images'],
    queryFn: fetchMemeImages,
    staleTime: 0,
    gcTime: 0,
    placeholderData: [],
    refetchOnMount: true,
    retry: 3,
  });

  return { images: images || [], ...restData }
}


export default useMemeImages;
