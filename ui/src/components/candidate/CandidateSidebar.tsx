import { Link } from 'react-router-dom';

type Props = {
  activeTab: 'profile' | 'applications' | 'subscription' | 'settings' | 'guides';
  onTabChange: (tab: 'profile' | 'applications' | 'subscription' | 'settings' | 'guides') => void;
  user: any;
  onLogout: () => void;
  onGoBack: () => void;
};

export default function CandidateSidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  onGoBack,
}: Props) {
  return (
    <div className="flex flex-col w-full lg:w-72 gap-6 p-6 rounded-2xl bg-[#1a1a1a] shadow-brand border border-white/10 shrink-0">
      <div 
        className="flex items-center gap-3 text-[#fcc636] hover:text-[#e6b535] transition-colors cursor-pointer mb-2"
        onClick={onGoBack}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
          <path d="M9.57 5.93018L3.5 12.0002L9.57 18.0702" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.4999 12H3.66992" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-lg">Back</span>
      </div>

      <div className="flex flex-col gap-3 p-4 rounded-lg bg-[#2b2b2b] border border-white/5 shadow-brand">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#fcc636] flex items-center justify-center text-[#2b2b2b] font-bold text-xl shadow-brand shrink-0">
            {user?.name?.charAt(0) || user?.email?.charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-lg font-bold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-white/60 truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-3 mt-2">
        <button 
          onClick={() => onTabChange('profile')}
          className={`w-full h-14 rounded-lg font-bold transition-all shadow-brand ${activeTab === 'profile' ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]' : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'}`}
        >
          My Profile
        </button>
        {user?.role === 'user' && (
          <button 
            onClick={() => onTabChange('applications')}
            className={`w-full h-14 rounded-lg font-bold transition-all shadow-brand ${activeTab === 'applications' ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]' : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'}`}
          >
            My Applications
          </button>
        )}
        <button 
          onClick={() => onTabChange('subscription')}
          className={`w-full h-14 rounded-lg font-bold transition-all shadow-brand ${activeTab === 'subscription' ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]' : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'}`}
        >
          Subscription & Credits
        </button>
        <button 
          onClick={() => onTabChange('settings')}
          className={`w-full h-14 rounded-lg font-bold transition-all shadow-brand ${activeTab === 'settings' ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]' : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'}`}
        >
          Settings
        </button>
        <button 
          onClick={() => onTabChange('guides')}
          className={`w-full h-14 rounded-lg font-bold transition-all shadow-brand ${activeTab === 'guides' ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]' : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'}`}
        >
          Guides & Help
        </button>
      </nav>

      <div className="h-px bg-white/10 my-2" />

      {(user?.role === 'recruiter' || user?.role === 'admin') && (
        <Link
          to="/recruiter"
          className="w-full h-14 rounded-lg bg-[#fcc636]/10 text-[#fcc636] border border-[#fcc636]/30 font-bold shadow-brand hover:bg-[#fcc636]/20 transition-all flex items-center justify-center mb-3"
        >
          Go to recruiter dashboard
        </Link>
      )}

      <button onClick={onLogout} className="w-full h-14 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-bold shadow-brand hover:bg-red-500/20 transition-all">
        Logout
      </button>
    </div>
  );
}
