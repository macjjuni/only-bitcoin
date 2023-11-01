import { useCallback } from 'react'
import { Box, Typography, Stack } from '@mui/material'
import { AiFillCaretDown } from 'react-icons/ai'

import { styled } from '@mui/material/styles'
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion'
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'

import { useBearStore } from '@/zustand/store'
import { IDropDown } from '@/zustand/type'

interface ICardItem {
  icon?: JSX.Element
  id: string
  title?: string
  children: React.ReactNode
}

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={1} square {...props} />)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': { borderBottom: 0 },
  '&:before': { display: 'none' },
}))

const AccordionSummary = styled((props: AccordionSummaryProps) => <MuiAccordionSummary {...props} />)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : '#fff',
  flexDirection: 'row-reverse',
  '& .MuiAccordionSummary-content': { marginLeft: theme.spacing(1) },
}))

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}))

const WidgetFrame = ({ id, icon, title, children }: ICardItem) => {
  const { dropDown, setDropDown } = useBearStore((state) => state)

  const toggleDropDown = useCallback(() => {
    if (!id) return
    if (dropDown[id] === undefined) return
    const params: IDropDown = {}
    params[id] = !dropDown[id]
    setDropDown(params)
  }, [dropDown])

  return (
    <div className="box-item">
      {/* 토글 숨김 처리시 unmountOnExit: true 해당 옵션으로 렌더링 최적화 */}
      <Accordion expanded={dropDown[id]} onChange={toggleDropDown} TransitionProps={{ unmountOnExit: true }}>
        <AccordionSummary expandIcon={icon} aria-controls="panel1d-content" id="panel1d-header" sx={{ width: '100%' }}>
          {title && (
            <Typography className="box-title" variant="h2" fontSize={18} fontWeight="bold" width="100%">
              <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
                <Box pl={1}>{title}</Box>
                <Box sx={{ rotate: `${dropDown[id] ? 0 : 180}deg`, transition: '0.3s ease' }}>
                  <AiFillCaretDown size={26} />
                </Box>
              </Stack>
            </Typography>
          )}
        </AccordionSummary>
        {/* 컨텐츠 */}
        <AccordionDetails>{children}</AccordionDetails>
      </Accordion>
    </div>
  )
}
export default WidgetFrame
