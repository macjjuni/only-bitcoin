import { memo } from 'react'
import styled from '@emotion/styled'
import Lottie, { LottieProps } from 'react-lottie-player'
import { AnimatePresence, motion } from 'framer-motion'
import logo from '@/assets/loading.json'

// Lottie Option
const defaultOptions: LottieProps = {
  loop: true,
  play: true,
  style: { width: '300px', height: '300px', margin: '0' },
}

const SpinnerWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding-bottom: 100px;
  background-color: #fff;
  z-index: 9999;
`

const Spinner = ({ isRender }: { isRender: boolean }) => {
  return (
    <AnimatePresence>
      {!isRender && (
        <SpinnerWrapper>
          <motion.div>
            <Lottie {...defaultOptions} animationData={logo} />
          </motion.div>
        </SpinnerWrapper>
      )}
    </AnimatePresence>
  )
}

export default memo(Spinner)
