import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'
import { startGoogleSignIn } from '../lib/googleAuth'
import TermsAgreement from '../components/TermsAgreement'
import TurnstileWidget, { type TurnstileWidgetHandle } from '../components/TurnstileWidget'
import { normalizePromoCode, writeStoredPromoCode } from '../lib/promoCode'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')
  const { register, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const refCode = searchParams.get('ref') || undefined
  const promoFromUrl = searchParams.get('promo') ?? searchParams.get('code')

  useEffect(() => {
    if (promoFromUrl) writeStoredPromoCode(normalizePromoCode(promoFromUrl))
  }, [promoFromUrl])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms of Service to register'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrors({})

    if (!validateForm()) {
      return
    }

    try {
      await register({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'user', // Default role
        referral_code: refCode,
        terms_accepted: termsAccepted,
        turnstile_token: turnstileToken
      })

      // Email verification is off for now (BFF__AUTH__REQUIRE_EMAIL_VERIFICATION=false).
      // const message = 'Registration successful! Check your email for a verification link that opens the web app and activates your account.'
      const message = 'Registration successful! You can log in now.'
      setSuccessMessage(message)
      notifySuccess(message)
    } catch (err) {
      const message = getErrorMessage(err, 'Registration failed')
      setErrors({
        general: message
      })
      notifyError(message)
    } finally {
      turnstileRef.current?.reset()
    }
  }

  return (
    <>
      <Helmet>
        <title>Register - Kraftisium</title>
        <meta name="description" content="Create your Kraftisium account to start your AI-powered job search journey." />
        <meta name="keywords" content="register, sign up, create account, resume matching, job search" />
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
            <h1 className="text-2xl font-bold text-white mb-2">Hello...</h1>
            <h2 className="text-5xl font-bold text-white">Register</h2>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                className={`k-input ${errors.fullName ? 'border-red-500' : ''}`}
              />
              {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                className={`k-input ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Create a password"
                className={`k-input ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                className={`k-input ${errors.confirmPassword ? 'border-red-500' : ''}`}
              />
              {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword}</p>}
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="text-center">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            {/* General Error Message */}
            {errors.general && (
              <div className="text-center">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-start gap-2.5 text-sm text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: '' }))
                  }}
                  className="mt-0.5 w-4 h-4 accent-[#fcc636] shrink-0"
                />
                <TermsAgreement role="candidate" />
              </label>
              {errors.terms && <p className="text-red-400 text-sm mt-1">{errors.terms}</p>}
            </div>

            {/* CAPTCHA */}
            <div className="flex justify-center">
              <TurnstileWidget
                ref={turnstileRef}
                action="signup"
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
              />
            </div>

            {/* Register Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading || !turnstileToken}
                className="k-btn w-40 h-14"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#2b2b2b] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Register'
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

          <TermsAgreement role="candidate" className="mt-4" />

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-white">
              Already have an account?{' '}
              <Link to="/login" className="text-[#fcc636] hover:text-[#e6b535] transition-colors font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default RegisterPage