import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './MockVersion/ws-server/ws'

// import App from './App.tsx'
import MockServerApp from './MockVersion/App.tsx'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <MockServerApp />
  </StrictMode>
)
