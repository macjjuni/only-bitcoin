import { memo, useState } from 'react'
import { Stack, IconButton } from '@mui/material'
import { LuCopyright } from 'react-icons/lu'
import SettingIcon from '@/components/SettingIcon'
import CopyDialog from '@/components/CopyDialog'
import SettingDialog from '@/components/SettingDialog'
import Logo from '@/components/Logo'

const iconStyle = {
  fontSize: '20px',
  color: '#2e2e2e',
}

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
          <IconButton title="설정" onClick={onSet}>
            <SettingIcon />
          </IconButton>
          <Stack component="div" flexDirection="row" alignItems="center" gap="4px">
            <IconButton size="small" onClick={onCopy}>
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
