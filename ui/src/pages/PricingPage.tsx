import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { isUserPremium } from '../types/subscription'
import { formatYearlyPrice, usePricingInfo } from '../hooks/usePricingInfo'

const FEATURES = [
  'Unlimited active job posts',
  'Full applicant pipeline with candidate details',
  'Featured listings & priority placement',
  'Premium recruiter dashboard tools',
]

const PricingPage = () => {
  const { user } = useAuth()
  const sub = user?.subscription
  const premium = isUserPremium(sub)
  const { yearlyPrice, promoLoading } = usePricingInfo()

  return (
    <>
      <Helmet>
        <title>Recruiter Premium - Kraftisium</title>
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-20 px-4 md:px-16">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold text-center">Recruiter Yearly Premium</h1>
          <p className="mt-4 text-center text-white/60">
            One plan for serious hiring. Post jobs, reach matched candidates, and manage your pipeline.
          </p>

          <div className="mt-10 rounded-2xl border border-[#fcc636]/30 bg-[#1a1a1a] p-8 shadow-brand">
            <p className="text-xs font-bold uppercase tracking-widest text-[#fcc636]">Yearly Premium</p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-bold text-[#fcc636]">
                {promoLoading && yearlyPrice == null ? '…' : formatYearlyPrice(yearlyPrice)}
              </span>
              <span className="text-white/50 pb-2">/ year</span>
            </div>
            <p className="mt-2 text-sm text-white/50">
              Have a promo code? Enter it at checkout for a discount.
            </p>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
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
                <Link to="/checkout" className="mt-4 inline-block text-sm text-[#fcc636] underline">
                  Subscription details
                </Link>
              </div>
            ) : (
              <Link
                to="/checkout"
                className="mt-8 flex w-full items-center justify-center rounded-xl bg-[#fcc636] py-4 font-bold text-[#2b2b2b] shadow-brand hover:bg-[#e6b535]"
              >
                Continue to checkout
              </Link>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Billed yearly via secure Razorpay checkout.{' '}
            <Link to="/upgrade" className="text-[#fcc636] underline">
              View full Premium details
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default PricingPage
