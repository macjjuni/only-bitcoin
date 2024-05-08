import { memo } from 'react'

interface ISats {
  width: number
  height: number
}

const SatIcon = ({ width = 40, height = 40 }: ISats) => {
  return <img src="./images/sat.webp" alt="Satoshi Symbol" className="sat-img" width={width} height={height} />
}

export default memo(SatIcon)
