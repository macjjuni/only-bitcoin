import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { favoriteRouteList } from "@/shared/config/route";
import { DEFAULT_INITIAL_PATH, INITIAL_PATH_COOKIE_KEY } from "@/shared/constants/setting";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * 루트(`/`) 진입 시 쿠키에 저장된 시작 페이지로 서버 사이드 리다이렉트한다.
 * 쿠키가 없거나 유효한 시작 페이지 목록에 없는 값이면 기본 페이지로 보낸다.
 * 쿠키 값 자체는 클라이언트(`useInitializePage`)에서 Zustand 설정과 동기화된다.
 */
export default async function Home({ searchParams }: HomeProps) {
  const cookiePath = (await cookies()).get(INITIAL_PATH_COOKIE_KEY)?.value;

  const initialPath =
    cookiePath && favoriteRouteList.some((route) => route.path === cookiePath)
      ? cookiePath
      : DEFAULT_INITIAL_PATH;

  // 유입 채널 파라미터(utm 등) 보존을 위해 쿼리 스트링을 그대로 이어붙인다.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `${initialPath}?${queryString}` : initialPath);
}
