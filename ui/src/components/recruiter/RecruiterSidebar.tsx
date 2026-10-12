import { RecruiterTab, Company } from '../../services/bffApi';

const TABS: { id: RecruiterTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'applicants', label: 'All Applicants' },
  { id: 'sourcing', label: 'Sourcing & Matcher' },
  { id: 'settings', label: 'Settings' },
  { id: 'guides', label: 'Guides & Help' },
];

type Props = {
  activeTab: RecruiterTab;
  onTabChange: (tab: RecruiterTab) => void;
  userName?: string;
  onLogout: () => void;
  myCompanies: Company[];
  selectedCompanyId: string | null;
  onCompanyChange: (id: string) => void;
};

export default function RecruiterSidebar({
  activeTab,
  onTabChange,
  userName,
  onLogout,
  myCompanies,
  selectedCompanyId,
  onCompanyChange,
}: Props) {
  return (
    <div className="flex flex-col w-full lg:w-72 gap-6 p-6 rounded-2xl bg-[#1a1a1a] shadow-brand border border-white/10 shrink-0">
      <div className="flex flex-col gap-1 p-4 rounded-lg bg-[#2b2b2b] border border-white/5 shadow-brand">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Hello</p>
        <p className="text-lg font-bold text-[#fcc636] truncate">{userName || 'Recruiter'}</p>
      </div>

      {myCompanies.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="company-switcher" className="text-xs font-bold uppercase tracking-widest text-white/40">Active Company</label>
            <button
              type="button"
              onClick={() => onCompanyChange('NEW_COMPANY')}
              className="text-[10px] font-bold uppercase tracking-wider text-[#fcc636] bg-[#fcc636]/10 hover:bg-[#fcc636]/20 px-2 py-0.5 rounded transition-colors"
            >
              + New
            </button>
          </div>
          <select
            id="company-switcher"
            value={selectedCompanyId || ''}
            onChange={(e) => onCompanyChange(e.target.value)}
            className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/20 rounded-lg text-white text-sm outline-none focus:border-[#fcc636] transition-colors"
          >
            {myCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="NEW_COMPANY" className="font-bold text-[#fcc636]">
              + Create new company
            </option>
          </select>
        </div>
      )}

      <nav className="flex flex-col gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`w-full h-12 rounded-lg font-bold transition-all text-sm ${
              activeTab === tab.id
                ? 'bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]'
                : 'bg-[#fcc636] text-[#2b2b2b] hover:bg-[#e6b535]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="h-px bg-white/10" />

      <button
        type="button"
        onClick={onLogout}
        className="w-full h-12 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500/20 transition-all text-sm"
      >
        Logout
      </button>
    </div>
  );
}
