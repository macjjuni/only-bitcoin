import { useRef, useEffect } from 'react'
import { useBearStore } from './zustand/store'

const App = () => {
  const bears = useBearStore((state) => state.bears)
  const bearsRef = useRef(useBearStore.getState().bears) // Transient updates

  const upBear = useBearStore((state) => state.increase)
  const clear = useBearStore((state) => state.clear)

  useEffect(() => {
    // Transient updates
    useBearStore.subscribe((state) => {
      bearsRef.current = state.bears
    })
  }, [])

  return (
    <div className="App">
      <center>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
      </center>
      <h1>Vite + React</h1>
      <div className="card">
        <center>
          {/* <h2>count is {bears}</h2> */}
          <h2>Count = {bears}</h2>
        </center>
        <center>
          <button
            type="button"
            onClick={() => {
              upBear(1)
            }}
          >
            증가
          </button>
          <button
            type="button"
            onClick={() => {
              clear()
            }}
          >
            초기화
          </button>
        </center>
      </div>
    </div>
  )
}

export default App
