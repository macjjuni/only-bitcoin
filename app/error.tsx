'use client'

import { useEffect } from 'react'
import { KButton } from 'kku-ui'

interface ErrorProps {
  error: Error & { digest?: string };
}

export default function Error({ error }: ErrorProps) {

  // region [Life Cycles]
  useEffect(() => {
    console.error('Unhandled Error:', error)
  }, [error])
  // endregion

  // region [Events]
  const onRefresh = () => {
    window.location.reload();
  }
  // endregion

  // region [Render]
  return (
    <div className="flex flex-col justify-center items-center gap-3 h-screen font-mono text-center p-6">
      <h2 className="text-md font-bold mb-2">알 수 없는 오류가 발생했습니다.</h2>

      <p
        className="text-sm w-full bg-[#1e1e1e] text-white p-3 rounded-md border border-[#30363d] max-w-md break-all leading-relaxed">
        <span className="text-[#7ee787] mr-2">$</span>
        {error.message || 'Unknown error occurred.'}
      </p>

      <KButton onClick={onRefresh} className="mt-4">
        다시 시도
      </KButton>
    </div>
  )
  // endregion
};