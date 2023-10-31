import { memo, ReactNode } from 'react'
import { Stack, Card, CardActions, CardContent, Typography } from '@mui/material'

interface ICard {
  width?: string
  minWidth?: string
  title: string | ReactNode
  content: string | ReactNode
  bottom?: string | ReactNode
}

const CardItem = ({ width = '100%', minWidth = '200px', title, content, bottom }: ICard) => {
  return (
    <Card sx={{ minWidth, width }}>
      <CardContent>
        <Typography variant="h4" fontSize={16} gutterBottom>
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
