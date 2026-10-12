import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet'
import { authApi } from '../services/authApi'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isResetSuccess, setIsResetSuccess] = useState(false)
  const navigate = useNavigate()

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await authApi.requestPasswordReset({ email })
      setIsSubmitted(true)
      notifySuccess(`Password reset link sent to ${email}.`)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to send reset email')
      setError(message)
      notifyError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) return
    setError('')
    setIsLoading(true)
    try {
      await authApi.requestPasswordReset({ email })
      setIsSubmitted(true)
      notifySuccess(`Reset email resent to ${email}.`)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to resend')
      setError(message)
      notifyError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      const message = 'Password must be at least 8 characters'
      setError(message)
      notifyError(message)
      return
    }
    if (newPassword !== confirmPassword) {
      const message = 'Passwords do not match'
      setError(message)
      notifyError(message)
      return
    }
    if (!tokenFromUrl) {
      const message = 'Invalid or missing reset token'
      setError(message)
      notifyError(message)
      return
    }
    setIsLoading(true)
    try {
      await authApi.resetPassword({ token: tokenFromUrl, new_password: newPassword })
      setIsResetSuccess(true)
      notifySuccess('Password reset successfully. You can now log in.')
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to reset password')
      setError(message)
      notifyError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isResetSuccess) {
    return (
      <>
        <Helmet>
          <title>Password Reset - Kraftisium</title>
        </Helmet>
        <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="text-6xl">✓</div>
            <h1 className="text-3xl font-bold text-white">Password Reset</h1>
            <p className="text-white/70">Your password has been reset. You can now log in.</p>
            <Link
              to="/login"
            className="k-btn w-full h-14"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (tokenFromUrl) {
    return (
      <>
        <Helmet>
          <title>Set New Password - Kraftisium</title>
        </Helmet>
        <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-8">
            <div className="flex items-center gap-3 text-[#fcc636] hover:text-[#e6b535] transition-colors cursor-pointer"
                 onClick={() => navigate('/')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M9.57 5.92969L3.5 11.9997L9.57 18.0697" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.5 12H3.67004" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-lg">Back</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
            </div>
            <form onSubmit={handleConfirmReset} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-white block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (error) setError('') }}
                  placeholder="At least 8 characters"
                  className="k-input"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white block">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  placeholder="Confirm your new password"
                  className="k-input"
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="k-btn w-40 h-14"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-[#2b2b2b] border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    )
  }

  if (isSubmitted) {
    return (
      <>
        <Helmet>
          <title>Check Your Email - Kraftisium</title>
          <meta name="description" content="We've sent you a password reset link. Check your email to continue." />
        </Helmet>

        <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-8 text-center">
            {/* Back Button */}
            <div className="flex items-center gap-3 text-[#fcc636] hover:text-[#e6b535] transition-colors cursor-pointer justify-center"
                 onClick={() => navigate('/')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M9.57 5.92969L3.5 11.9997L9.57 18.0697" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.5 12H3.67004" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-lg">Back</span>
            </div>

            <div className="space-y-6">
              <div className="text-6xl">📧</div>
              <h1 className="text-3xl font-bold text-white">Check Your Email</h1>
              <p className="text-white/70">
                We've sent a password reset link to <strong className="text-[#fcc636]">{email}</strong>
              </p>

              <div className="space-y-4">
                <p className="text-sm text-white/50">
                  Didn't receive the email?{' '}
                  <button
                    onClick={handleResend}
                    className="text-[#fcc636] hover:text-[#e6b535] transition-colors font-medium underline"
                  >
                    Resend
                  </button>
                </p>

                <Link
                  to="/login"
                  className="k-btn w-full h-14"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Reset Password - Kraftisium</title>
        <meta name="description" content="Reset your Kraftisium password to regain access to your account." />
        <meta name="keywords" content="reset password, forgot password, account recovery" />
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

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">Hello...</h1>
            <h2 className="text-5xl font-bold text-white leading-tight">
              Reset<br />Password
            </h2>
          </div>

          {/* Request Reset Form */}
          <form onSubmit={handleRequestReset} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm text-white block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter your email address"
                className="k-input"
                required
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            {/* Reset Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="k-btn w-40 h-14"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[#2b2b2b] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Reset'
                )}
              </button>
            </div>
          </form>

          <div className="h-px bg-white/10 my-6" />

          {/* Resend Info */}
          <div className="text-center">
            <p className="text-sm text-white">
              Didn't get the email?{' '}
              <button
                onClick={handleResend}
                className="text-[#fcc636] hover:text-[#e6b535] transition-colors font-medium"
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default ResetPasswordPage