
export interface MemeResponseImageData {
  src: string; // 이미지 URL
  alt: string; // 이미지 설명
  tags: string[]; // 태그 리스트
}


async function getMemeImageData(): Promise<MemeResponseImageData[]> {
  const JSON_URL =
    'https://raw.githubusercontent.com/macjjuni/only-bitcoin/refs/heads/meme-page/public/images/meme.json';

  try {
    const response = await fetch(JSON_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data; // JSON 데이터 반환
  } catch (error) {
    console.error('Failed to fetch images:', error);
    return [];
  }
};

export default getMemeImageData
