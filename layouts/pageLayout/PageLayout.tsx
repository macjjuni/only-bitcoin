import { ReactNode } from 'react'
import { NotKeyNotYourBitcoin } from '@/components'


interface PageLayoutProps {
  className?: string;
  children: ReactNode;
}


export default function PageLayout({ children, className }: PageLayoutProps) {

  return (
    <section className={[
      'relative w-full max-w-layout mx-auto flex flex-col flex-auto gap-2 p-2 pt-2.5',
      className,
    ].filter(Boolean).join(' ')}>
      {children}
      <NotKeyNotYourBitcoin/>
    </section>
  )
}