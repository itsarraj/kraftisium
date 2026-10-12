import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import PromoCodeRedeem from '../components/PromoCodeRedeem'
import { useAuth } from '../contexts/AuthContext'
import { formatPaymentAmount } from '../lib/formatCurrency'
import { clearStoredPromoCode } from '../lib/promoCode'
import { subscriptionApi } from '../services/subscriptionApi'
import type { CheckoutStatusResponse } from '../types/subscription'
import { formatYearlyPrice, usePricingInfo } from '../hooks/usePricingInfo'
import { usePromoCode } from '../hooks/usePromoCode'

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || ''

interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  handler: (response: RazorpayHandlerResponse) => void
  modal?: { ondismiss?: () => void }
}

interface RazorpayInstance {
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void
  open: () => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  const existing = document.getElementById('razorpay-checkout-js')
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
    })
  }
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.id = 'razorpay-checkout-js'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const CheckoutPage = () => {
  const { user, isAuthenticated, refreshUser } = useAuth()
  const { yearlyPrice: promoYearlyPrice } = usePricingInfo()
  const [status, setStatus] = useState<CheckoutStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  const promo = usePromoCode({ captureFromUrl: true, autoValidate: true })

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const next = await subscriptionApi.getCheckoutStatus()
      setStatus(next)
    } catch {
      setStatus({
        status: 'error',
        message: 'Could not load checkout status.',
        is_premium: false,
        yearly_price_usd: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    loadStatus()
  }, [isAuthenticated, loadStatus])

  const handleClearPromo = () => {
    promo.clear()
    clearStoredPromoCode()
  }

  useEffect(() => {
    if (!status?.payments_enabled) return
    loadRazorpayScript().then(setScriptReady)
  }, [status?.payments_enabled])

  const handlePay = async () => {
    if (!isAuthenticated || !status?.payments_enabled) return

    setPaying(true)
    setError(null)

    try {
      if (!scriptReady || !window.Razorpay) {
        const loaded = await loadRazorpayScript()
        if (!loaded || !window.Razorpay) {
          throw new Error('Could not load Razorpay checkout. Check your network connection.')
        }
        setScriptReady(true)
      }

      const appliedCode = promo.isValid ? promo.code : undefined
      const order = await subscriptionApi.createOrder(appliedCode)

      if (order.amount === 0) {
        await refreshUser()
        await loadStatus()
        clearStoredPromoCode()
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                status: 'already_subscribed',
                is_premium: true,
                message: 'Your Premium gift is active — welcome aboard!',
                payments_enabled: false,
              }
            : prev
        )
        setPaying(false)
        return
      }

      const keyId = order.key_id || status.razorpay_key_id || RAZORPAY_KEY_ID
      if (!keyId) {
        throw new Error('Razorpay is not configured on this app.')
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: import.meta.env.VITE_APP_NAME || 'Kraftisium',
        description: 'Yearly Premium subscription',
        order_id: order.order_id,
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#fcc636' },
        handler: async (response) => {
          try {
            const verified = await subscriptionApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            await refreshUser()
            await loadStatus()
            clearStoredPromoCode()
            setStatus((prev) =>
              prev
                ? {
                    ...prev,
                    status: 'already_subscribed',
                    is_premium: true,
                    message: verified.message,
                    payments_enabled: false,
                  }
                : prev
            )
          } catch (verifyErr) {
            setError(
              verifyErr instanceof Error
                ? verifyErr.message
                : 'Payment verification failed.'
            )
          } finally {
            setPaying(false)
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false)
            setError('Payment cancelled.')
          },
        },
      })

      rzp.on('payment.failed', (response) => {
        setPaying(false)
        setError(response.error?.description || 'Payment failed. Please try again.')
      })

      rzp.open()
    } catch (err) {
      setPaying(false)
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#2b2b2b] text-white flex items-center justify-center px-4">
        <p>
          <Link to="/login" className="text-[#fcc636] underline">Log in</Link> to continue.
        </p>
      </div>
    )
  }

  const already = status?.status === 'already_subscribed' || status?.is_premium
  const paymentsReady = status?.payments_enabled && status.status === 'ready'
  const resolvedYearlyPrice =
    status?.yearly_price_usd && status.yearly_price_usd > 0
      ? status.yearly_price_usd
      : promoYearlyPrice
  const displayAmount =
    status?.amount_paise != null
      ? formatPaymentAmount(status.amount_paise, status.currency)
      : formatYearlyPrice(resolvedYearlyPrice)

  const payLabel = paying
    ? 'Processing…'
    : promo.isFree
      ? 'Claim your free year →'
      : 'Pay with Razorpay'

  return (
    <>
      <Helmet>
        <title>Checkout - Kraftisium</title>
      </Helmet>
      <div className="min-h-screen bg-[#2b2b2b] text-white py-16 px-4">
        <div className="container mx-auto max-w-lg text-center">
          {loading ? (
            <div className="w-12 h-12 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin mx-auto" />
          ) : already ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fcc636]/15 ring-2 ring-[#fcc636]/40">
                <span className="text-3xl text-[#fcc636]">✦</span>
              </div>
              <h1 className="mt-6 text-3xl font-bold text-[#fcc636]">You&apos;re Premium</h1>
              <p className="mt-4 text-lg text-white/80">{status?.message}</p>
              <Link
                to={user?.role === 'recruiter' || user?.role === 'admin' ? '/recruiter' : '/ai-matches'}
                className="mt-8 inline-block rounded-xl bg-[#fcc636] px-8 py-3 font-bold text-[#2b2b2b]"
              >
                Start exploring →
              </Link>
            </>
          ) : paymentsReady ? (
            <>
              <h1 className="text-3xl font-bold">Checkout</h1>
              <p className="mt-4 text-white/60">{status?.message}</p>

              {!promo.isValid && (
                <p className="mt-6 text-2xl font-bold text-[#fcc636]">
                  {displayAmount} / year
                </p>
              )}

              <div className="mt-8 text-left">
                <PromoCodeRedeem
                  code={promo.code}
                  onCodeChange={promo.setCode}
                  onApply={() => void promo.apply()}
                  onClear={handleClearPromo}
                  validation={promo.validation}
                  loading={promo.loading}
                  error={promo.error}
                  yearlyPrice={resolvedYearlyPrice}
                />
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={handlePay}
                disabled={
                  paying ||
                  (!scriptReady && (!promo.isValid || !promo.isFree))
                }
                className="mt-8 inline-block w-full rounded-xl bg-[#fcc636] px-8 py-4 text-lg font-bold text-[#2b2b2b] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#e6b535]"
              >
                {payLabel}
              </button>
              {!promo.isFree && (
                <p className="mt-4 text-sm text-white/40">
                  Secure checkout powered by Razorpay.
                </p>
              )}
              <Link to="/upgrade" className="mt-4 inline-block text-sm text-[#fcc636] underline">
                View Premium benefits
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">Checkout unavailable</h1>
              <p className="mt-6 text-white/70">{status?.message}</p>
              <p className="mt-4 text-2xl font-bold text-[#fcc636]">
                {formatYearlyPrice(resolvedYearlyPrice)} / year
              </p>
              <div className="mt-8 text-left">
                <PromoCodeRedeem
                  code={promo.code}
                  onCodeChange={promo.setCode}
                  onApply={() => void promo.apply()}
                  onClear={handleClearPromo}
                  validation={promo.validation}
                  loading={promo.loading}
                  error={promo.error}
                  yearlyPrice={resolvedYearlyPrice}
                />
              </div>
              <Link to="/redeem" className="mt-6 inline-block text-[#fcc636] underline">
                Have a gift code? Redeem here
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default CheckoutPage
