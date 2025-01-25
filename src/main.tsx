import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  UIProvider,
  extendConfig,
  ThemeConfig,
} from "@yamada-ui/react"
import App from './App.tsx'

export const config: ThemeConfig = {
  initialColorMode: "system",
}
const customConfig = extendConfig(config)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UIProvider config={customConfig}>
      <App />
    </UIProvider>
  </StrictMode>,
)
