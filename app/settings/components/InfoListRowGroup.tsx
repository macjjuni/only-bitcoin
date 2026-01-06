'use client'

import { memo, useCallback } from 'react'
import { CodeXml, QrCode as QrCodeIcon } from 'lucide-react'
import { clipboardUtil } from 'kku-util'
import { QRCode } from 'react-qrcode-logo'
import { KButton, KIcon, KListGroup, KListRow, KListRowAccordion, kToast } from 'kku-ui'
import { sourceOptions } from '@/shared/constants/setting'

const LIGHTNING_ADDRESS = process.env.NEXT_PUBLIC_DONATION_ADDRESS || ''
const FEEDBACK_URL = process.env.NEXT_PUBLIC_FEEDBACK_URL || 'https://x.com/a7w2en7z_'
const DONATE_VALUE = 'donation' as const

const InfoListRowGroup = () => {

  // region [Privates]
  const onScrollDown = useCallback(() => {
    const container: HTMLElement | null = document.querySelector('.only-btc__content')
    if (container) {
      setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      }, 300)
    }
  }, [])

  const onRouteToFeedback = useCallback(() => {
    window.open(FEEDBACK_URL, '_blank', 'noopener,noreferrer')
  }, [])
  // endregion

  // region [Events]
  const onChangeDonationRow = useCallback((val: string) => {
    if (val === DONATE_VALUE) {
      onScrollDown()
    }
  }, [])

  const onClickCopyAddress = useCallback(async () => {

    const isCopySuccess = await clipboardUtil.copyToClipboard(LIGHTNING_ADDRESS)
    if (isCopySuccess) {
      kToast.success('주소 복사 완료! 👍')
    }
  }, [])
  // endregion


  return (
    <KListGroup header="정보">
      <KListRowAccordion value={DONATE_VALUE} label="개발자 후원" icon={<QrCodeIcon/>}
                         onValueChange={onChangeDonationRow}>
        <div className="flex flex-col justify-center items-center gap-4 pb-4">
          <QRCode value={LIGHTNING_ADDRESS} size={264}
                  logoImage="https://www.walletofsatoshi.com/assets/images/icon.png"
                  logoPadding={2}/>
          <KButton variant="primary" onClick={onClickCopyAddress}>
            라이트닝 주소 복사
          </KButton>
        </div>
      </KListRowAccordion>

      <KListRowAccordion value="resource" label="리소스 출처" icon={<CodeXml/>}>
        <ul>
          {sourceOptions.map(({ label, value }) => (
            <li key={label} className="text-sm text-current tracking-tighter">- {label}: {value}</li>
          ))}
        </ul>
      </KListRowAccordion>
      <KListRow icon={<KIcon icon="x_logo" size={24}/>} label="피드백" onClick={onRouteToFeedback}/>
      <KListRow icon={<KIcon icon="dev" color="#333" size={24}/>}
                label="버전 정보"
                rightElement={
                  <span className="text-[17px] text-muted-foreground">
                    {process.env.NEXT_PUBLIC_APP_VERSION || '-'}
                  </span>
                }
      />
    </KListGroup>
  )
}

const MemoizedInfoListRowGroup = memo(InfoListRowGroup)
MemoizedInfoListRowGroup.displayName = 'InfoListRowGroup'

export default MemoizedInfoListRowGroup
