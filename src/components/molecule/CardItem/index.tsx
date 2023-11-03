import { memo, ReactNode } from 'react'
import { Stack, Card, CardActions, CardContent, Typography } from '@mui/material'

interface ICard {
  width?: string
  minWidth?: string
  matches?: boolean
  title: string | ReactNode
  content: string | ReactNode
  bottom?: string | ReactNode
}

const CardItem = ({ width = '100%', minWidth = '220px', title, matches = true, content, bottom }: ICard) => {
  return (
    <Card sx={{ minWidth, width }}>
      <CardContent sx={{ display: matches ? 'block' : 'flex', justifyContent: matches ? 'none' : 'space-between', pb: matches ? 2 : 0 }}>
        <Typography variant="h4" fontSize={16} fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          {content}
        </Stack>
      </CardContent>
      <CardActions>
        <Typography component="div" fontSize={14} width="100%" p="0 0 8px 8px">
          {bottom}
        </Typography>
      </CardActions>
    </Card>
  )
}

export default memo(CardItem)
