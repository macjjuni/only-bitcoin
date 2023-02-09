import { useAppSelector, useAppDispatch } from './redux/hook'
import { up, down } from './redux/slice/counter'

const App = () => {
  const dispatch = useAppDispatch()
  const state = useAppSelector((store) => store.counter.value)

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
          <h2>count is {state}</h2>
        </center>
        <center>
          <button type="button" onClick={() => dispatch(up(100))}>
            UP
          </button>{' '}
          <button type="button" onClick={() => dispatch(down(100))}>
            DOWN
          </button>
        </center>
      </div>
    </div>
  )
}

export default App
