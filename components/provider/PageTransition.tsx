'use client'

// region [Imports]
import { useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
// endregion

export default function PageTransition({ children }: { children: ReactNode }) {
  // region [States]
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    setIsVisible(false) // 경로 변경 시 일단 숨김 (선택 사항)

    const timer = requestAnimationFrame(() => {
      setIsVisible(true)
    })

    return () => cancelAnimationFrame(timer)
  }, [pathname])
  // endregion

  // region [Render]
  return (
    <div className={`
      transition-opacity duration-500 ease-in-out
      ${isVisible ? 'opacity-100' : 'opacity-0'}
    `}>
      {children}
    </div>
  )
  // endregion
}