import { ReactNode } from 'react'

export default function DefaultLayout({ children }: { children: ReactNode }) {

  return (
    <div
      className={[
        'relative flex flex-col',
        'w-full max-w-layout h-[100dvh]',
        'm-0 mx-auto',
        'layout-max:border-x border-border',
        'overflow-x-hidden'
      ].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

