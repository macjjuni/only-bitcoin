import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 다음으로 시작하는 경로를 제외한 요청에만 적용:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico, sitemap.xml, manifest.json 등 정적 파일
     * - public 폴더 내 이미지 확장자 (.svg, .png, .jpg, .jpeg, .gif, .webp 등)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
