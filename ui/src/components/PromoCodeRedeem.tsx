import type { ValidatePromoResponse } from '../types/subscription'
import { formatYearlyPrice } from '../hooks/usePricingInfo'
import { promoDurationLabel } from '../lib/promoCode'

type PromoCodeRedeemProps = {
  code: string
  onCodeChange: (code: string) => void
  onApply: () => void
  onClear: () => void
  validation: ValidatePromoResponse | null
  loading: boolean
  error: string | null
  variant?: 'default' | 'hero'
  yearlyPrice?: number
}

export default function PromoCodeRedeem({
  code,
  onCodeChange,
  onApply,
  onClear,
  validation,
  loading,
  error,
  variant = 'default',
  yearlyPrice,
}: PromoCodeRedeemProps) {
  const isValid = validation?.is_valid === true
  const isFree = isValid && validation.final_price_usd === 0
  const isHero = variant === 'hero'

  const shellClass = isHero
    ? 'relative overflow-hidden rounded-2xl border border-[#fcc636]/40 bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#1a1a1a] p-8 shadow-brand'
    : 'rounded-2xl border border-[#fcc636]/25 bg-[#1a1a1a] p-5'

  return (
    <div className={shellClass}>
      {isHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#fcc636]/10 blur-3xl"
        />
      )}

      {isValid ? (
        <div className="relative text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fcc636]/15 ring-2 ring-[#fcc636]/40">
            <span className="text-2xl text-[#fcc636]">✦</span>
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-[#fcc636]">
            {isFree ? 'Gift unlocked' : 'Promo applied'}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {isFree
              ? `${promoDurationLabel(validation.duration_months)} of Premium — on us`
              : `$${validation.discount_amount_usd} off Yearly Premium`}
          </h2>
          {yearlyPrice != null && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-lg text-white/40 line-through">
                {formatYearlyPrice(yearlyPrice)}
              </span>
              <span className="text-3xl font-bold text-[#fcc636]">
                {isFree ? '$0' : `$${validation.final_price_usd}`}
              </span>
              <span className="text-white/50">/ year</span>
            </div>
          )}
          <p className="mt-3 font-mono text-sm tracking-widest text-white/60">{code}</p>
          <button
            type="button"
            onClick={onClear}
            className="mt-5 text-sm text-white/40 underline hover:text-white/70"
          >
            Use a different code
          </button>
        </div>
      ) : (
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-[#fcc636]">
            {isHero ? "You've been invited" : 'Promo code'}
          </p>
          {isHero && (
            <p className="mt-2 text-white/70">
              Enter the code you received to unlock your Premium gift.
            </p>
          )}
          <div className={`flex gap-2 ${isHero ? 'mt-6' : 'mt-3'}`}>
            <input
              type="text"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onApply()}
              disabled={loading}
              placeholder="YOUR-CODE"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded-xl border border-white/10 bg-[#2b2b2b] px-4 py-3 font-mono uppercase tracking-wider text-white placeholder:text-white/25 focus:border-[#fcc636]/50 focus:outline-none focus:ring-1 focus:ring-[#fcc636]/30 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={onApply}
              disabled={loading || !code.trim()}
              className="shrink-0 rounded-xl bg-[#fcc636] px-5 py-3 font-bold text-[#2b2b2b] shadow-brand transition hover:bg-[#e6b535] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '…' : 'Apply'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
