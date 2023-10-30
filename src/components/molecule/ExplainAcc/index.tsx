import { memo } from 'react'
import { Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material'

interface IExplainAcc {
  title: string | React.ReactNode
  content: string | React.ReactNode
}

const ExplainAcc = ({ title, content }: IExplainAcc) => {
  return (
    <>
      <Accordion>
        <AccordionSummary aria-controls="panel1a-content" id="panel1a-header">
          <Typography fontSize={16} fontWeight="bold">
            {title}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>{content}</AccordionDetails>
      </Accordion>
    </>
  )
}

export default memo(ExplainAcc)
