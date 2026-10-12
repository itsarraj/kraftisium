import { useCallback, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PromoCodeRedeem from '../components/PromoCodeRedeem'
import { useAuth } from '../contexts/AuthContext'
import { formatYearlyPrice, usePricingInfo } from '../hooks/usePricingInfo'
import { usePromoCode } from '../hooks/usePromoCode'
import { notifyError, notifySuccess } from '../lib/toast'
import { subscriptionApi } from '../services/subscriptionApi'
import { isUserPremium } from '../types/subscription'

export default function RedeemPage() {
  const [searchParams] = useSearchParams()
  const urlPromo = searchParams.get('promo') ?? searchParams.get('code') ?? undefined
  const { user, isAuthenticated, refreshUser } = useAuth()
  const { yearlyPrice } = usePricingInfo()
  const navigate = useNavigate()

  const promo = usePromoCode({
    captureFromUrl: true,
    autoValidate: Boolean(urlPromo),
    initialCode: urlPromo,
  })

  const [claiming, setClaiming] = useState(false)

  const premium = isUserPremium(user?.subscription)

  const handleClaim = useCallback(async () => {
    if (!isAuthenticated || !promo.isValid) return

    setClaiming(true)
    try {
      const order = await subscriptionApi.createOrder(promo.code)
      if (order.amount === 0) {
        await refreshUser()
        notifySuccess('Welcome to Premium — your gift is active!')
        navigate('/ai-matches', { replace: true })
        return
      }
      navigate('/checkout')
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Could not redeem promo code')
    } finally {
      setClaiming(false)
    }
  }, [isAuthenticated, navigate, promo.code, promo.isValid, refreshUser])

  const checkoutHref = promo.isValid && promo.isPartialDiscount ? '/checkout' : '/checkout'
  const authHref = `/login?redirect=${encodeURIComponent('/redeem' + (urlPromo ? `?promo=${encodeURIComponent(urlPromo)}` : ''))}`
  const registerHref = `/register?promo=${encodeURIComponent(promo.code || urlPromo || '')}`

  return (
    <>
      <Helmet>
        <title>Redeem Premium - Kraftisium</title>
      </Helmet>
      <div className="min-h-screen bg-[#2b2b2b] text-white py-16 px-4">
        <div className="container mx-auto max-w-lg">
          <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-[#fcc636]">
            Kraftisium Premium
          </p>
          <h1 className="mt-3 text-center text-4xl font-bold">Redeem your gift</h1>
          <p className="mt-3 text-center text-white/60">
            Yearly Premium — unlimited AI matches, top placement, full access.
          </p>

          <div className="mt-10">
            <PromoCodeRedeem
              variant="hero"
              code={promo.code}
              onCodeChange={promo.setCode}
              onApply={() => void promo.apply()}
              onClear={promo.clear}
              validation={promo.validation}
              loading={promo.loading}
              error={promo.error}
              yearlyPrice={yearlyPrice}
            />
          </div>

          {premium ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 text-center">
              <p className="text-lg font-bold text-[#fcc636]">You&apos;re already Premium</p>
              <Link
                to={user?.role === 'recruiter' || user?.role === 'admin' ? '/recruiter' : '/ai-matches'}
                className="mt-4 inline-block rounded-xl bg-[#fcc636] px-8 py-3 font-bold text-[#2b2b2b]"
              >
                Back to app
              </Link>
            </div>
          ) : promo.isValid ? (
            <div className="mt-8 space-y-3">
              {isAuthenticated ? (
                <>
                  {promo.isFree ? (
                    <button
                      type="button"
                      onClick={() => void handleClaim()}
                      disabled={claiming}
                      className="flex w-full items-center justify-center rounded-xl bg-[#fcc636] py-4 text-lg font-bold text-[#2b2b2b] shadow-brand hover:bg-[#e6b535] disabled:opacity-50"
                    >
                      {claiming ? 'Activating…' : 'Claim your free year →'}
                    </button>
                  ) : (
                    <Link
                      to={checkoutHref}
                      className="flex w-full items-center justify-center rounded-xl bg-[#fcc636] py-4 text-lg font-bold text-[#2b2b2b] shadow-brand hover:bg-[#e6b535]"
                    >
                      Continue to checkout — {formatYearlyPrice(promo.validation!.final_price_usd)}/yr
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to={registerHref}
                    className="flex w-full items-center justify-center rounded-xl bg-[#fcc636] py-4 text-lg font-bold text-[#2b2b2b] shadow-brand hover:bg-[#e6b535]"
                  >
                    {promo.isFree ? 'Create account & claim gift →' : 'Sign up to redeem →'}
                  </Link>
                  <p className="text-center text-sm text-white/50">
                    Already have an account?{' '}
                    <Link to={authHref} className="text-[#fcc636] underline">
                      Log in
                    </Link>
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="mt-8 text-center text-sm text-white/40">
              No code yet? Ask whoever invited you — each code is personal and single-use.
            </p>
          )}

          <p className="mt-10 text-center text-xs text-white/30">
            <Link to="/upgrade" className="underline hover:text-white/50">
              View Premium benefits
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
