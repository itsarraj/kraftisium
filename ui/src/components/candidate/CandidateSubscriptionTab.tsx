import { Link } from 'react-router-dom';
import { isUserPremium } from '../../types/subscription';
import { formatYearlyPrice } from '../../hooks/usePricingInfo';
import { useReferralSettings } from '../../hooks/useReferralSettings';

type Props = {
  user: any;
  yearlyPrice: number;
  freeMatchLimit: number;
  isRedeeming: boolean;
  onRedeemCredits: () => void;
};

export default function CandidateSubscriptionTab({
  user,
  yearlyPrice,
  freeMatchLimit,
  isRedeeming,
  onRedeemCredits,
}: Props) {
  const referralSettings = useReferralSettings();
  const creditsPerReferral = referralSettings?.credits_per_referral;
  const creditsNeeded = referralSettings?.credits_required_for_redemption;
  const premiumMonths = referralSettings?.redemption_premium_months;
  const monthsLabel = premiumMonths == null ? 'month' : premiumMonths === 1 ? 'month' : `${premiumMonths} months`;
  const monthsLabelCaps = premiumMonths == null ? 'Month' : premiumMonths === 1 ? 'Month' : `${premiumMonths} Months`;

  const credits = user?.referral_credits || 0;
  const progress = creditsNeeded ? Math.min(100, (credits / creditsNeeded) * 100) : 0;
  const isPremium = isUserPremium(user?.subscription);
  const refLink = `${window.location.origin}/register?ref=${user?.referral_code}`;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#fcc636] to-[#ffaa00] p-8 md:p-10 text-[#2b2b2b] shadow-brand">
        <div className="relative z-10 max-w-2xl space-y-4">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Unlock Premium.<br />Get Hired Faster.
          </h2>
          <p className="text-lg font-bold opacity-90 max-w-xl">
            Invite friends to Kraftisium. They get a head start, and you earn credits towards free Premium—boosting your profile to the top of recruiter searches!
          </p>
        </div>
        <svg className="absolute right-0 top-0 h-full w-1/2 opacity-20 transform translate-x-1/4 scale-150" viewBox="0 0 100 100" preserveAspectRatio="none" fill="currentColor">
          <polygon points="0,100 100,0 100,100" />
        </svg>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Referral Engine */}
        <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-brand flex flex-col">
          <div className="mb-8">
            <h3 className="text-2xl font-black text-white mb-3 flex items-center gap-3">
              <span className="text-3xl">🎁</span> Give {creditsPerReferral ?? '—'}, Get {creditsPerReferral ?? '—'}!
            </h3>
            <p className="text-white/70 text-base leading-relaxed">
              Share your unique link below. Every time a friend signs up, you both get <span className="text-[#fcc636] font-bold">{creditsPerReferral ?? '—'} credits</span>.
              Earn {creditsNeeded ?? '—'} credits to instantly unlock a <span className="text-white font-bold border-b border-[#fcc636]">free {monthsLabel} of Premium</span>!
            </p>
          </div>

          <div className="bg-[#2b2b2b] rounded-2xl p-6 mb-8 border border-white/5 relative overflow-hidden shadow-inner">
            <div className="flex justify-between items-end mb-5 relative z-10">
              <div>
                <p className="text-xs text-white/50 mb-1 uppercase tracking-widest font-bold">Your Balance</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-[#fcc636] drop-shadow-[0_2px_10px_rgba(252,198,54,0.3)]">{credits}</span>
                  <span className="text-white/40 font-bold text-lg">/ {creditsNeeded ?? '—'}</span>
                </div>
              </div>
              <button
                onClick={onRedeemCredits}
                disabled={isRedeeming || creditsNeeded == null || credits < creditsNeeded}
                className="h-12 px-6 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-black hover:bg-[#ffaa00] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(252,198,54,0.4)] disabled:shadow-none hover:scale-105 active:scale-95"
              >
                {isRedeeming ? 'Redeeming...' : `Unlock Free ${monthsLabelCaps}`}
              </button>
            </div>

            <div className="relative z-10">
              <div className="w-full h-4 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/10 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#fcc636] to-[#ffaa00] rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
              <p className="text-sm text-white/50 mt-3 text-center font-bold">
                {creditsNeeded == null
                  ? ' '
                  : credits >= creditsNeeded
                    ? `🎉 You have enough credits to redeem!`
                    : `Just ${creditsNeeded - credits} more credits for a free ${monthsLabel}.`}
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <p className="text-sm font-bold text-white/80 uppercase tracking-wider">Your personal invite link</p>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                readOnly 
                value={refLink}
                className="w-full bg-black/40 text-white/90 px-5 py-4 rounded-xl border border-white/10 outline-none font-mono text-sm selection:bg-[#fcc636] selection:text-black transition-colors focus:border-[#fcc636]/50 shadow-inner"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(refLink)
                }}
                className="bg-[#2b2b2b] hover:bg-[#fcc636] text-white hover:text-black transition-all h-14 w-14 flex items-center justify-center rounded-xl shadow-brand group shrink-0 border border-white/5 hover:border-transparent"
                title="Copy to clipboard"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Status & Benefits */}
        <div className="flex flex-col gap-6">
          <div className="p-8 rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-brand relative overflow-hidden group h-full flex flex-col">
            <div className="absolute -top-10 -right-10 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor" className="text-[#fcc636]">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
            </div>
            
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Current Plan</p>
            
            {isPremium || user?.is_premium_candidate ? (
              <div className="space-y-2 mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fcc636]/10 text-[#fcc636] border border-[#fcc636]/30 mb-3 shadow-[0_0_15px_rgba(252,198,54,0.1)]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcc636] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcc636]"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">Premium Active</span>
                </div>
                <p className="text-3xl font-black text-white tracking-tight">Premium Member</p>
                {user?.subscription?.premium_until && (
                  <p className="text-sm text-white/50 font-bold">
                    Renews on {new Date(user.subscription.premium_until).toLocaleDateString()}
                  </p>
                )}
                {user?.is_premium_candidate && !user?.subscription?.premium_until && (
                  <p className="text-sm text-white/50 font-bold">
                    Legacy Premium Access
                  </p>
                )}
                {user?.subscription?.founding_slot != null && (
                  <p className="text-sm text-[#fcc636] mt-2 font-bold bg-[#fcc636]/10 inline-block px-2 py-1 rounded">
                    ✨ Founding Member #{user.subscription.founding_slot}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2 mb-8">
                <p className="text-3xl font-black text-white tracking-tight">Free Basic</p>
                <p className="text-sm text-white/60 font-bold">{freeMatchLimit ?? '—'} AI matches per job</p>
              </div>
            )}

            <div className="space-y-5 mb-10">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Why upgrade?</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-white/80 text-sm">
                  <div className="bg-[#fcc636]/20 p-1.5 rounded-full shrink-0">
                    <svg className="w-4 h-4 text-[#fcc636]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Top of the list</strong>
                    <span className="text-white/60">Your profile is instantly bumped to the top of recruiter searches. Get noticed 5x faster.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-white/80 text-sm">
                  <div className="bg-[#fcc636]/20 p-1.5 rounded-full shrink-0">
                    <svg className="w-4 h-4 text-[#fcc636]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Unlimited AI Matches</strong>
                    <span className="text-white/60">See exactly how well you fit every single job, with no daily limits holding you back.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 text-white/80 text-sm">
                  <div className="bg-[#fcc636]/20 p-1.5 rounded-full shrink-0">
                    <svg className="w-4 h-4 text-[#fcc636]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">Priority Support</strong>
                    <span className="text-white/60">Skip the queue and get help faster when you need it most.</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-auto pt-6 border-t border-white/10">
              <Link 
                to="/upgrade" 
                className={`block w-full py-4 text-center rounded-xl font-black transition-all uppercase tracking-wider text-sm ${
                  isPremium 
                  ? 'bg-[#2b2b2b] hover:bg-[#333] text-white border border-white/10 hover:border-white/30'
                  : 'bg-[#fcc636] hover:bg-[#ffaa00] text-[#2b2b2b] shadow-[0_4px_20px_rgba(252,198,54,0.3)] hover:shadow-[0_4px_25px_rgba(252,198,54,0.5)] hover:-translate-y-0.5'
                }`}
              >
                {isPremium ? 'Manage Subscription' : `Upgrade Now — ${formatYearlyPrice(yearlyPrice)}/yr`}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
