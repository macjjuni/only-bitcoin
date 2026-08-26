import type { Metadata } from "next";
import { NotFoundContent } from "@/views/not-found";

/**
 * `robots` 는 안 씀. Next 가 not-found 에 `noindex` 를 자동으로 넣어 주므로
 * 여기서 또 지정하면 robots 메타가 두 개 나감.
 */
export const metadata: Metadata = {
  title: "404 - 페이지를 찾을 수 없습니다",
};

export default function NotFound() {
  return <NotFoundContent />;
}
