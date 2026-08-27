import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Providers } from './providers/Web3Providers'
import { InterfoldSdkProvider } from './providers/InterfoldSdkProvider'
import { HomePage } from './pages/HomePage'
import { CreatePage } from './pages/CreatePage'
import { RespondPage } from './pages/RespondPage'
import { SubmitProgramPage } from './pages/SubmitProgramPage'

export default function App() {
  return (
    <Providers>
      <InterfoldSdkProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/respond" element={<RespondPage />} />
            <Route path="/submit" element={<SubmitProgramPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </InterfoldSdkProvider>
    </Providers>
  )
}
