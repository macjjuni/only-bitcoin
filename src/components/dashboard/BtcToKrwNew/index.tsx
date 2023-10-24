import { useState } from 'react'
import { BiTransferAlt } from 'react-icons/bi'

import { styled } from '@mui/material/styles'
import MuiAccordion, { AccordionProps } from '@mui/material/Accordion'
import MuiAccordionSummary, { AccordionSummaryProps } from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import { btcColor } from '@/data/btcInfo'

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  '&:not(:last-child)': { borderBottom: 0 },
  '&:before': { display: 'none' },
}))

const AccordionSummary = styled((props: AccordionSummaryProps) => <MuiAccordionSummary expandIcon={<BiTransferAlt fontSize={26} color={btcColor} />} {...props} />)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : '#fff',
  flexDirection: 'row-reverse',
  '& .MuiAccordionSummary-content': { marginLeft: theme.spacing(1) },
}))

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: '1px solid rgba(0, 0, 0, .125)',
}))

const BtcToKrwNew = () => {
  const [expanded, setExpanded] = useState<string | false>('panel1')

  const handleChange = (panel: string) => (event: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded ? panel : false)
  }

  return (
    <Accordion expanded={expanded === 'panel1'} onChange={handleChange('panel1')}>
      <AccordionSummary aria-controls="panel1d-content" id="panel1d-header">
        {/* 타이틀 */}
        <Typography sx={{ paddingLeft: '4px' }}>
          <b>BTC/KRW</b>
        </Typography>
      </AccordionSummary>
      {/* 컨텐츠 */}
      <AccordionDetails>123</AccordionDetails>
    </Accordion>
  )
}
export default BtcToKrwNew
