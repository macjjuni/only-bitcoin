import { Card, Box, Typography, Stack, IconButton } from '@mui/material'
import { AiFillCaretDown } from 'react-icons/ai'
import { useBearStore } from '@/zustand/store'
import { IDropDown } from '@/zustand/type'

interface ICardItem {
  icon?: JSX.Element
  id?: string
  title?: string
  height?: string
  noShadow?: boolean
  noBg?: boolean
  children: React.ReactNode
}

const toggleClassName = 'toggle-down'

const CardItem = ({ id, icon, title, height, noShadow, noBg, children }: ICardItem) => {
  const { dropDown, setDropDown } = useBearStore((state) => state)

  const toggleDropDown = () => {
    if (!id) return
    if (dropDown[id] === undefined) return
    const params: IDropDown = {}
    params[id] = !dropDown[id]
    setDropDown(params)
  }

  return (
    <Card
      className={`box-item ${id && dropDown[id] ? toggleClassName : ''} ${noShadow ? 'no-shadow' : ''} ${noBg ? 'no-bg' : ''}`}
      sx={{ padding: '12px', boxShadow: 'none', height: height || 'auto' }}
    >
      {title && (
        <Typography className="box-title" variant="h2" fontSize={20} fontWeight="bold" pb="12px" mb="12px" borderBottom="1px solid #efefef">
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Stack flexDirection="row" alignItems="center" gap={1}>
              <Box height="24px">{icon}</Box>
              <Box height="100%">{title}</Box>
            </Stack>
            <IconButton className="toggle-btn" onClick={toggleDropDown} size="small">
              <AiFillCaretDown />
            </IconButton>
          </Stack>
        </Typography>
      )}
      {children}
    </Card>
  )
}
export default CardItem
