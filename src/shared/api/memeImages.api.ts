import { useQuery } from "@tanstack/react-query";
import { MemeImageResponseData } from "@/shared/types/api/memeImage";
import fetcher from "@/shared/utils/fetcher";
import { isDev, shuffleArray } from "@/shared/utils/common";

const MEME_IMAGE_API_URL = `${import.meta.env.VITE_MEME_IMAGE_URL}/meme.json`;


const fetchMemeImages = async (): Promise<MemeImageResponseData[]> => {

  try {
    const data = await fetcher<MemeImageResponseData[]>(MEME_IMAGE_API_URL);

    if (isDev) { console.log("✅ meme.json 데이터 초기화!"); }
    return shuffleArray(data);

  } catch (e) {
    console.error(e);
    return [];
  }
};


function useMemeImages() {

  const { data: images, ...restData } = useQuery({
    queryKey: ["meme-images"],
    queryFn: fetchMemeImages,
    staleTime: 0,
    gcTime: 0,
    placeholderData: [],
    refetchOnMount: true,
    retry: 3
  });

  return { images: images || [], ...restData };
}


export default useMemeImages;
