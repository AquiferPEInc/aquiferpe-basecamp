import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import CompanyPage from './pages/CompanyPage'
import EmailCampaignPage from './pages/EmailCampaignPage'
import DashboardPage from './pages/DashboardPage'
import ClientPage from './pages/ClientPage'
import FreelancerPage from './pages/FreelancerPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/company" replace />} />
              <Route path="/company" element={<CompanyPage />} />
              <Route path="/email-campaign" element={<EmailCampaignPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/client" element={<ClientPage />} />
              <Route path="/freelancer" element={<FreelancerPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App