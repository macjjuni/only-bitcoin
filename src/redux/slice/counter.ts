import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface ICounter {
  value: number
}

const initialState: ICounter = { value: 0 }

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    up: (state: ICounter, action: PayloadAction<number>) => {
      state.value += action.payload
    },
    down: (state, action) => {
      state.value -= action.payload
    },
  },
})

// 카운터 액션 내보내기
export const { up, down } = counterSlice.actions
