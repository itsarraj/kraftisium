import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authApi } from '../services/authApi'
import { getErrorMessage, notifyError, notifySuccess } from '../lib/toast'

const VERIFY_TIMEOUT_MS = 15000

const inflightVerifications = new Map<string, Promise<{ message: string }>>()

function verifyEmailOnce(token: string): Promise<{ message: string }> {
  const existing = inflightVerifications.get(token)
  if (existing) return existing

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS)

  const promise = authApi
    .verifyEmail(token, controller.signal)
    .finally(() => {
      window.clearTimeout(timeoutId)
      inflightVerifications.delete(token)
    })

  inflightVerifications.set(token, promise)
  return promise
}

function readVerificationToken(searchParams: URLSearchParams, pathToken?: string): string {
  const fromPath = pathToken?.trim()
  if (fromPath) return fromPath

  const queryToken = searchParams.get('token')?.trim()
  if (queryToken) return queryToken

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  return new URLSearchParams(hash).get('token')?.trim() ?? ''
}

const VerifyEmailPage = () => {
  const navigate = useNavigate()
  const { token: pathToken } = useParams()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = useMemo(
    () => readVerificationToken(searchParams, pathToken),
    [searchParams, pathToken]
  )
  const [manualToken, setManualToken] = useState('')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(() =>
    tokenFromUrl ? 'loading' : 'idle'
  )
  const [message, setMessage] = useState(() =>
    tokenFromUrl
      ? 'Verifying your email address...'
      : 'Open the verification link from your email, or paste the verification code from that email below.'
  )

  useEffect(() => {
    if (!tokenFromUrl) return

    let cancelled = false

    const verify = async () => {
      try {
        const response = await verifyEmailOnce(tokenFromUrl)
        if (cancelled) return
        const successMessage =
          response.message || 'Your email has been verified successfully. You can sign in now.'
        setStatus('success')
        setMessage(successMessage)
        notifySuccess(successMessage, { id: 'verify-email-status' })
        window.history.replaceState(window.history.state, document.title, '/verify-email')
      } catch (error) {
        if (cancelled) return
        const failureMessage = getErrorMessage(
          error,
          'Verification failed. The link may be invalid or expired.'
        )
        setStatus((prev) => (prev === 'success' ? prev : 'error'))
        setMessage((prev) => {
          if (prev.includes('verified successfully')) return prev
          return (
            failureMessage +
            (failureMessage.includes('Invalid') || failureMessage.includes('expired')
              ? ' If you already verified, try logging in.'
              : '')
          )
        })
        notifyError(failureMessage, { id: 'verify-email-status' })
      }
    }

    void verify()

    return () => {
      cancelled = true
    }
  }, [tokenFromUrl])

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = manualToken.trim()
    if (!value) {
      notifyError('Paste the verification token from your email.', { id: 'verify-email-status' })
      return
    }

    setStatus('loading')
    setMessage('Verifying your email address...')

    try {
      const response = await verifyEmailOnce(value)
      const successMessage =
        response.message || 'Your email has been verified successfully. You can sign in now.'
      setStatus('success')
      setMessage(successMessage)
      notifySuccess(successMessage, { id: 'verify-email-status' })
    } catch (error) {
      const failureMessage =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Verification timed out. Check that the backend is running, then try again.'
          : getErrorMessage(error, 'Verification failed. The link may be invalid or expired.')
      setStatus('error')
      setMessage(
        failureMessage +
          (failureMessage.includes('Invalid') || failureMessage.includes('expired')
            ? ' If you already verified, try logging in.'
            : '')
      )
      notifyError(failureMessage, { id: 'verify-email-status' })
    }
  }

  return (
    <>
      <Helmet>
        <title>Verify Email - Kraftisium</title>
        <meta
          name="description"
          content="Confirm your Kraftisium email address to finish setting up your account."
        />
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8">
          <div
            className="flex items-center gap-3 text-[#fcc636] hover:text-[#e6b535] transition-colors cursor-pointer"
            onClick={() => navigate('/')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M9.57 5.92969L3.5 11.9997L9.57 18.0697" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.5 12H3.67004" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-lg">Back</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-8 text-center shadow-xl">
            <div className="mb-6 text-5xl">
              {status === 'loading' ? '...' : status === 'success' ? '✓' : status === 'error' ? '!' : '✉'}
            </div>

            <h1 className="text-3xl font-bold text-white">
              {status === 'loading'
                ? 'Verifying Email'
                : status === 'success'
                  ? 'Email Verified'
                  : status === 'error'
                    ? 'Verification Issue'
                    : 'Verify Your Email'}
            </h1>

            <p className="mt-4 text-base text-white/70 leading-7">{message}</p>

            {status === 'loading' && (
              <div className="mt-8 flex justify-center">
                <div className="w-8 h-8 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {status === 'idle' && !tokenFromUrl && (
              <form onSubmit={handleManualVerify} className="mt-8 space-y-4 text-left">
                <label className="block text-sm text-white/70" htmlFor="verify-token">
                  Verification code
                </label>
                <input
                  id="verify-token"
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste code from your email"
                  className="w-full rounded-lg border border-white/15 bg-[#2b2b2b] px-4 py-3 text-white placeholder:text-white/30"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#fcc636] px-4 py-4 text-base font-bold text-[#2b2b2b] hover:bg-[#e6b535]"
                >
                  Verify email
                </button>
              </form>
            )}

            {status !== 'loading' && status !== 'idle' && (
              <div className="mt-8 space-y-4">
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#fcc636] px-4 py-4 text-base font-bold text-[#2b2b2b] transition-colors hover:bg-[#e6b535]"
                >
                  {status === 'success' ? 'Continue to Login' : 'Go to Login'}
                </Link>

                {status === 'error' && (
                  <Link
                    to="/register"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 py-4 text-base font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Register Again
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default VerifyEmailPage
