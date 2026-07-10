import type { ReactNode } from "react";

export default function DefaultLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={[
        "relative flex flex-col",
        "w-full max-w-layout h-[100dvh]",
        "m-0 mx-auto",
        "layout-max:border-x border-border",
        // overflow-x 만 지정하면 overflow-y 가 auto 로 승격되어 이 요소가 스크롤 컨테이너가 된다.
        // 스크롤은 Content(main) 가 전담하므로 여기서는 양축 모두 잘라낸다.
        "overflow-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
