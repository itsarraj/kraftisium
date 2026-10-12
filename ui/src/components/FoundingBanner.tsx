import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { subscriptionApi } from '../services/subscriptionApi'
import type { PromoBannerInfo } from '../types/subscription'

const DISMISS_KEY = 'kraftisium_founding_banner_dismissed'

const FoundingBanner = () => {
  const [promo, setPromo] = useState<PromoBannerInfo | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  )

  useEffect(() => {
    subscriptionApi.getPromoBanner().then(setPromo).catch(() => {})
  }, [])

  if (dismissed || !promo || !promo.founding_offer_active) return null

  return (
    <div className="bg-[#fcc636] text-[#2b2b2b] px-4 py-2.5 text-center text-sm relative">
      <p className="font-medium pr-8">
        {promo.message}{' '}
        <Link to="/register" className="underline font-bold hover:opacity-80">
          Join now
        </Link>
        {' · '}
        <Link to="/upgrade" className="underline font-bold hover:opacity-80">
          Premium ${promo.yearly_price_usd}/yr
        </Link>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setDismissed(true)
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

export default FoundingBanner
