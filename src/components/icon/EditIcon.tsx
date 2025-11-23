import {memo} from 'react'
import {IconTypes} from '@/components/icon/icon'

const EditIcon = ({size = '100%', color = 'currentColor', style}: IconTypes) => {
  return (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g strokeWidth="0"/>
      <g strokeLinecap="round" strokeLinejoin="round"/>
      <g>
        <path
          d="M12 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V12M9 15V12.5L17.75 3.75C18.4404 3.05964 19.5596 3.05964 20.25 3.75V3.75C20.9404 4.44036 20.9404 5.55964 20.25 6.25L15.5 11L11.5 15H9Z"
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  )
}

export default memo(EditIcon)
