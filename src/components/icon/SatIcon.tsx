interface ISats {
  width: number
  height: number
}

const SatIcon = ({ width, height }: ISats) => {
  return <img src="./images/sat.jpeg" alt="Satoshi Symbol" width={width} height={height} />
}

export default SatIcon
