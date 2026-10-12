import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import PromoCodeRedeem from '../components/PromoCodeRedeem'
import { useAuth } from '../contexts/AuthContext'
import { usePromoCode } from '../hooks/usePromoCode'
import { isUserPremium } from '../types/subscription'
import { formatYearlyPrice, usePricingInfo } from '../hooks/usePricingInfo'

const FEATURES_USER = [
  'Unlimited AI job matches (not just 3)',
  'Full semantic ranking on your resume',
  'Apply to any matched role',
  'Priority refresh when you update your resume',
]

const FEATURES_RECRUITER = [
  'Unlimited active job posts',
  'Full applicant pipeline with candidate details',
  'Featured listings',
  'Premium recruiter dashboard tools',
]

const UpgradePage = () => {
  const { user, isAuthenticated } = useAuth()
  const sub = user?.subscription
  const premium = isUserPremium(sub)
  const { yearlyPrice, promoLoading } = usePricingInfo()
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin'
  const features = isRecruiter ? FEATURES_RECRUITER : FEATURES_USER

  const promo = usePromoCode({ captureFromUrl: true, autoValidate: true })

  const checkoutTarget = promo.isValid
    ? isAuthenticated
      ? '/checkout'
      : `/register?promo=${encodeURIComponent(promo.code)}`
    : isAuthenticated
      ? '/checkout'
      : '/register'

  return (
    <>
      <Helmet>
        <title>Yearly Premium - Kraftisium</title>
      </Helmet>
      <div className="min-h-screen bg-[#2b2b2b] text-white py-16 px-4 md:px-16">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-center">Yearly Premium</h1>
          <p className="mt-4 text-center text-white/60">
            One simple plan. Billed yearly. No monthly subscriptions.
          </p>

          {!premium && (
            <div className="mt-8">
              <PromoCodeRedeem
                variant={promo.isValid ? 'hero' : 'default'}
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
          )}

          <div className="mt-8 rounded-2xl border border-[#fcc636]/30 bg-[#1a1a1a] p-8 shadow-brand">
            <p className="text-xs font-bold uppercase tracking-widest text-[#fcc636]">Best value</p>
            {promo.isValid && !promo.isFree ? (
              <div className="mt-4 flex items-end gap-2">
                <span className="text-2xl text-white/40 line-through">
                  {promoLoading && yearlyPrice == null ? '…' : formatYearlyPrice(yearlyPrice)}
                </span>
                <span className="text-5xl font-bold text-[#fcc636]">
                  ${promo.validation!.final_price_usd}
                </span>
                <span className="text-white/50 pb-2">/ year</span>
              </div>
            ) : promo.isFree ? (
              <div className="mt-4">
                <span className="text-5xl font-bold text-[#fcc636]">$0</span>
                <span className="text-white/50 pb-2 ml-2">/ year with your code</span>
              </div>
            ) : (
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-bold text-[#fcc636]">
                  {promoLoading && yearlyPrice == null ? '…' : formatYearlyPrice(yearlyPrice)}
                </span>
                <span className="text-white/50 pb-2">/ year</span>
              </div>
            )}

            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-3 text-white/80">
                  <span className="text-[#fcc636]">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {premium ? (
              <div className="mt-8 rounded-xl bg-[#2b2b2b] border border-white/10 p-6 text-center">
                <p className="text-lg font-bold text-[#fcc636]">You&apos;re already Premium</p>
                {sub?.premium_until && (
                  <p className="mt-2 text-sm text-white/60">
                    Active until {new Date(sub.premium_until).toLocaleDateString()}
                  </p>
                )}
                <Link
                  to="/checkout"
                  className="mt-4 inline-block text-sm text-[#fcc636] underline"
                >
                  View subscription details
                </Link>
              </div>
            ) : (
              <Link
                to={checkoutTarget}
                className="mt-8 flex w-full items-center justify-center rounded-xl bg-[#fcc636] py-4 font-bold text-[#2b2b2b] shadow-brand hover:bg-[#e6b535]"
              >
                {promo.isFree
                  ? isAuthenticated
                    ? 'Claim your free year →'
                    : 'Sign up & claim gift →'
                  : isAuthenticated
                    ? 'Continue to checkout'
                    : 'Sign up to upgrade'}
              </Link>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Got a personal invite?{' '}
            <Link to="/redeem" className="text-[#fcc636] underline">
              Redeem your code
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default UpgradePage
