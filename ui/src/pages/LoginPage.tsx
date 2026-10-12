import { useRef, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { startGoogleSignIn } from '../lib/googleAuth'
import { isUserPremium } from '../types/subscription'
import { readStoredPromoCode } from '../lib/promoCode'
import { resolvePostLoginPath } from '../lib/postLoginRedirect'
import TurnstileWidget, { type TurnstileWidgetHandle } from '../components/TurnstileWidget'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const [error, setError] = useState('')
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const redirectParam = searchParams.get('redirect')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const loggedIn = await login({ ...formData, turnstile_token: turnstileToken })
      notifySuccess('Welcome back to Kraftisium.')
      if (isUserPremium(loggedIn.subscription)) {
        notifySuccess('Your Yearly Premium subscription is active.')
      }
      const pendingPromo = readStoredPromoCode()
      const explicitRedirect = redirectParam || location.state?.from?.pathname
      const destination =
        pendingPromo && !isUserPremium(loggedIn.subscription)
          ? '/redeem'
          : explicitRedirect || resolvePostLoginPath(loggedIn)
      navigate(destination, { replace: true })
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed')
      setError(message)
      notifyError(message)
    } finally {
      turnstileRef.current?.reset()
    }
  }

  return (
    <>
      <Helmet>
        <title>Login - Kraftisium</title>
        <meta name="description" content="Sign in to your Kraftisium account to find your dream job with AI-powered resume matching." />
        <meta name="keywords" content="login, sign in, authentication, resume matching, job search" />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Back Button */}
          <div className="flex items-center gap-3 text-[#fcc636] hover:text-[#e6b535] transition-colors cursor-pointer"
               onClick={() => navigate('/')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M9.57 5.92969L3.5 11.9997L9.57 18.0697" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.5 12H3.67004" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-lg">Back</span>
          </div>

          {/* Welcome Message */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back!!!</h1>
            <h2 className="text-5xl font-bold text-white">Login</h2>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className="k-input"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="k-input"
                required
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link to="/reset-password" className="text-sm text-[#fcc636] hover:text-[#e6b535] transition-colors">
                Forget Password?
              </Link>
            </div>

            {/* CAPTCHA */}
            <div className="flex justify-center">
              <TurnstileWidget
                ref={turnstileRef}
                action="login"
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-center">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || !turnstileToken}
                className="k-btn w-40 h-14"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#2b2b2b] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="px-4 text-sm text-white/50">or</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button
            type="button"
            onClick={() => startGoogleSignIn('user')}
            disabled={isLoading}
            className="k-btn-outline w-full h-14"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M16.8433 6.54671C15.6043 5.36501 13.9508 4.72125 12.24 4.74771C9.10936 4.74771 6.45055 6.85976 5.50253 9.70376C4.99987 11.1941 4.99987 12.808 5.50253 14.2983H5.50693C6.45934 17.1379 9.11376 19.25 12.2444 19.25C13.8604 19.25 15.2478 18.8367 16.323 18.1066V18.1036C17.5885 17.2658 18.4528 15.9475 18.7217 14.4571H12.24V9.83612H23.5588C23.6999 10.6386 23.766 11.4588 23.766 12.2745C23.766 15.9243 22.4616 19.0101 20.1921 21.1001L20.1944 21.1019C18.2058 22.9362 15.4764 23.9989 12.24 23.9989C7.70278 23.9989 3.55359 21.4415 1.51648 17.3893C-0.18551 13.9985 -0.185506 10.0037 1.51649 6.61288C3.5536 2.5563 7.70277 -0.00114446 12.24 -0.00114446C15.2207 -0.0364191 18.1 1.08355 20.2694 3.12066L16.8433 6.54671Z" fill="#FCC636"/>
            </svg>
            Continue with Google
          </button>

          {/* Register Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-white">
              Don't have an account yet?{' '}
              <Link to="/register" className="text-[#fcc636] hover:text-[#e6b535] transition-colors font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginPage