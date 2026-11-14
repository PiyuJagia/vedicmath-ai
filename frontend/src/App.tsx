import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'
import { Providers } from './app/Providers'

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Providers>
  )
}

export default App
