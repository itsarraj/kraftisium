import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import PromoCodeCapture from './components/PromoCodeCapture'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import JobsListPage from './pages/JobsListPage'
import JobDetailPage from './pages/JobDetailPage'
import SavedJobsPage from './pages/SavedJobsPage'
import AIMatchesPage from './pages/AIMatchesPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import DownloadPage from './pages/DownloadPage'
import LoginPage from './pages/LoginPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import RecruiterPage from './pages/RecruiterPage'
import PricingPage from './pages/PricingPage'
import UpgradePage from './pages/UpgradePage'
import RedeemPage from './pages/RedeemPage'
import CheckoutPage from './pages/CheckoutPage'
import EmployersLandingPage from './pages/EmployersLandingPage'
import EmployerSignupPage from './pages/EmployerSignupPage'
import EmployerLoginPage from './pages/EmployerLoginPage'
import NotFoundPage from './pages/NotFoundPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import PressKitPage from './pages/PressKitPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import CookiesPage from './pages/CookiesPage'
import StandaloneMatcherPage from './pages/StandaloneMatcherPage'
import BrandToaster from './components/BrandToaster'
import AccountDeletedPage from './pages/AccountDeletedPage'
import AdminPage from './pages/AdminPage'
import DeleteAccountPage from './pages/DeleteAccountPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <PromoCodeCapture />
        <BrandToaster />
        <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/jobs" element={<JobsListPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route
                path="/ai-matches"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['user']}>
                    <AIMatchesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved-jobs"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['user']}>
                    <SavedJobsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/press-kit" element={<PressKitPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              <Route
                path="/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <LoginPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <RegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recruiter"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['recruiter', 'admin']}>
                    <RecruiterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/redeem"
                element={<RedeemPage />}
              />
              <Route
                path="/upgrade"
                element={<UpgradePage />}
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute requireAuth={true}>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pricing"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['recruiter', 'admin']}>
                    <PricingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employers"
                element={
                  <ProtectedRoute requireAuth={false} guestOnly={true}>
                    <EmployersLandingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employers/signup"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <EmployerSignupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employers/login"
                element={
                  <ProtectedRoute requireAuth={false}>
                    <EmployerLoginPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/matcher"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['recruiter', 'admin']}>
                    <StandaloneMatcherPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/account-deleted" element={<AccountDeletedPage />} />
              <Route path="/delete-account" element={<DeleteAccountPage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAuth={true} allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App