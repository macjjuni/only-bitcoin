import { memo, type Dispatch, type SetStateAction } from 'react'
import { RiCloseCircleLine } from 'react-icons/ri'
import { DialogTitle, Dialog, Container, Typography, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableRow, Paper } from '@mui/material'
import { comma } from '@/utils/common'
import { ecoSystemPyramid } from '@/data/btcInfo'

type DialogType = {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

const EcoDialog = ({ open, setOpen }: DialogType) => {
  const closeDialog = () => {
    setOpen(false)
  }

  return (
    <>
      <Dialog onClose={closeDialog} open={open} className="mui-dialog">
        <DialogTitle minWidth={340} borderBottom="1px solid #a5a5a5" sx={{ padding: '12px 16px' }}>
          <Stack flexDirection="row" justifyContent="space-between" alignItems="center">
            <Typography component="p" fontSize={16} fontWeight="bold">
              비트코인 생태계
            </Typography>
            <IconButton onClick={closeDialog} sx={{ padding: '0' }}>
              <RiCloseCircleLine fontSize={24} />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Container sx={{ padding: '16px' }}>
          <TableContainer component={Paper}>
            <Table aria-label="simple table" size="small">
              <TableBody>
                {ecoSystemPyramid.map((row) => (
                  <TableRow key={row.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      <Typography fontSize={24}>{row.emoji}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontSize={16}>{`${comma(row.min.toString())} ~ ${comma(row.max.toString())}`}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Container>
      </Dialog>
    </>
  )
}

export default memo(EcoDialog)
