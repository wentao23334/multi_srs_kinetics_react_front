import { AppShell } from './components/layout/AppShell'
import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <AppShell />
      <Toaster theme="light" position="top-right" />
    </>
  )
}

export default App
