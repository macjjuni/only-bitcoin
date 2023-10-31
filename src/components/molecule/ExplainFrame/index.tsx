import { memo } from 'react'
import { Accordion, AccordionSummary, AccordionDetails, Typography } from '@mui/material'

interface IExplainFrame {
  title: string | React.ReactNode
  content: string | React.ReactNode
}

// Explain 관련 컴포넌트 프레임

const ExplainFrame = ({ title, content }: IExplainFrame) => {
  return (
    <Accordion>
      <AccordionSummary aria-controls="panel1a-content" id="panel1a-header">
        <Typography fontSize={16} fontWeight="bold">
          {title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>{content}</AccordionDetails>
    </Accordion>
  )
}

export default memo(ExplainFrame)
