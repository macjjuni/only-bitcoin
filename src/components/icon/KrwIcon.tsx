import { memo } from 'react'
import { FaWonSign } from 'react-icons/fa'

interface IKrw {
  size: number
}

const KrwIcon = ({ size }: IKrw) => {
  return <FaWonSign size={size} color="#828282" />
}

export default memo(KrwIcon)
