'use client'

import { KIcon } from 'kku-ui'

interface UpdownIconTypes {
  isUp: boolean;
  size?: number;
}


export default function UpdownIcon({ isUp, size = 8 }: UpdownIconTypes) {

  return (<KIcon className="updown-icon" icon={isUp ? 'triangleUp' : 'triangleDown'}
                 color={isUp ? '#22d48e' : '#F6465D'} size={size} suppressHydrationWarning />)
}

