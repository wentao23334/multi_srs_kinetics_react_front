import { AppShell } from './components/layout/AppShell'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <AppShell />
      <Toaster theme="dark" richColors position="top-right" />
    </>
  )
}

export default App
