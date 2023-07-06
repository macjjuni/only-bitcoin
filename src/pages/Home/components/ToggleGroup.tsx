import { useState, type MouseEvent } from 'react'
import { ToggleButtonGroup, ToggleButton, Box } from '@mui/material'

const ToggleGroup = () => {
  const [devices, setDevices] = useState(() => ['phone'])

  const handleDevices = (e: MouseEvent<HTMLElement>, newDevices: string[]) => {
    e.preventDefault()
    if (newDevices.length) {
      setDevices(newDevices)
    }
  }

  return (
    <Box position="absolute" top="0" left="0" zIndex="99999">
      <ToggleButtonGroup value={devices} onChange={handleDevices} aria-label="device">
        <ToggleButton value="tv" aria-label="tv">
          1
        </ToggleButton>
        <ToggleButton value="tv" aria-label="tv">
          2
        </ToggleButton>
        <ToggleButton value="phone" aria-label="phone">
          3
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}
export default ToggleGroup
