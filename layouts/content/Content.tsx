import React, { ReactNode } from 'react'

export default function Content({ children, className } : { children: ReactNode; className?: string }) {
  return (
    <main
      className={[
        'content__layout', // 스크롤 제어용
        "flex flex-col flex-auto w-full mx-auto max-w-layout",
        "pt-[calc(theme(height.header)+16px)] pb-[calc(theme(height.bottom-nav)+8px)]",
        "overflow-auto",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </main>
  )
}