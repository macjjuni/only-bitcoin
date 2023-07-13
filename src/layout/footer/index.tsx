import { memo, useState } from 'react'
import { Stack, IconButton } from '@mui/material'
import SettingIcon from '@/components/SettingIcon'
import CopyDialog from '@/components/modal/CopyDialog'
import SettingDialog from '@/components/modal/SettingDialog'
import Logo from '@/components/Logo'

const Footer = () => {
  const [isCopy, setCopy] = useState(false)
  const [isSetting, setSetting] = useState(false)

  const onCopy = () => {
    setCopy(true)
  }
  const onSet = () => {
    setSetting(true)
  }

  return (
    <>
      <Stack component="footer" className="footer">
        <Stack component="div" flexDirection="row" justifyContent="space-between" alignItems="center" width="100%" color="#474E68">
          <IconButton size="small" title="설정" onClick={onSet}>
            <SettingIcon />
          </IconButton>
          <Stack component="div" flexDirection="row" alignItems="center" gap="4px">
            <IconButton size="small" title="정보" onClick={onCopy}>
              <Logo />
            </IconButton>
          </Stack>
        </Stack>
        <CopyDialog open={isCopy} setOpen={setCopy} />
        <SettingDialog open={isSetting} setOpen={setSetting} />
      </Stack>
    </>
  )
}

export default memo(Footer)
