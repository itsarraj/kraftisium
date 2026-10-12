import { useEffect, useState, useMemo } from 'react';
import { Company, CreateCompanyRequest } from '../../services/bffApi';

type Props = {
  company: Company | null;
  onSave: (payload: CreateCompanyRequest, isEdit: boolean) => Promise<void>;
  onCreateNew?: () => void;
  onCancel?: () => void;
};

const emptyForm = {
  name: '',
  logo_url: '',
  website: '',
  about: '',
  industry: '',
  employee_size: '',
  head_office: '',
  company_type: '',
  since: '',
  specialization: '',
};

export default function RecruiterCompanyTab({ company, onSave, onCreateNew, onCancel }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(!company);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name ?? '',
        logo_url: company.logo_url ?? '',
        website: company.website ?? '',
        about: company.about ?? '',
        industry: company.industry ?? '',
        employee_size: company.employee_size ?? '',
        head_office: company.head_office ?? '',
        company_type: company.company_type ?? '',
        since: company.since != null ? String(company.since) : '',
        specialization: Array.isArray(company.specialization) ? company.specialization.join(', ') : '',
      });
      setEditing(false);
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }
    setLoading(true);
    try {
      const payload: CreateCompanyRequest = {
        name: form.name.trim(),
        logo_url: form.logo_url.trim() || undefined,
        website: form.website.trim() || undefined,
        about: form.about.trim() || undefined,
        industry: form.industry.trim() || undefined,
        employee_size: form.employee_size.trim() || undefined,
        head_office: form.head_office.trim() || undefined,
        company_type: form.company_type.trim() || undefined,
        since: form.since ? parseInt(form.since, 10) : undefined,
        specialization: form.specialization.trim()
          ? form.specialization.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      await onSave(payload, Boolean(company));
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save company');
    } finally {
      setLoading(false);
    }
  };

  const brandScore = useMemo(() => {
    let score = 0;
    if (company?.logo_url && company.logo_url.trim() !== '') score += 30;
    if (company?.website && company.website.trim() !== '') score += 20;
    if (company?.about && company.about.trim() !== '') score += 50;
    return score;
  }, [company]);

  return (
    <div className="space-y-8 max-w-4xl">
      {company && !editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gamified Brand Score Widget */}
          <div className="md:col-span-2 p-6 rounded-xl bg-gradient-to-r from-[#1a1a1a] to-[#2b2b2b] border border-white/10 shadow-brand flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-white/10" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path 
                  className={brandScore === 100 ? "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" : "text-[#fcc636]"} 
                  strokeWidth="3" 
                  strokeDasharray={`${brandScore}, 100`} 
                  strokeLinecap="round" 
                  stroke="currentColor" 
                  fill="none" 
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-black ${brandScore === 100 ? 'text-green-400' : 'text-white'}`}>{brandScore}%</span>
              </div>
            </div>
            <div className="flex flex-col text-center sm:text-left">
              <h3 className="text-xl font-bold text-white mb-1">Employer Brand Score</h3>
              <p className="text-sm text-white/60 max-w-md">
                {brandScore === 100 
                  ? '✨ All-Star Company! Your profile is fully optimized. Expect up to 40% more candidate trust and applications.' 
                  : 'Companies with complete profiles (Logo, Website, About) receive 40% more applications. Edit your profile to boost your score!'}
              </p>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-[#1a1a1a] border border-white/10 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[#2b2b2b] flex items-center justify-center border border-white/10 overflow-hidden">
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-[#fcc636]">{company.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{company.name}</h3>
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="text-sm text-[#fcc636] hover:underline">
                    {company.website}
                  </a>
                )}
              </div>
            </div>
            {company.about && <p className="text-sm text-white/70 leading-relaxed">{company.about}</p>}
          </div>
          <div className="p-6 rounded-xl bg-[#1a1a1a] border border-white/10 grid grid-cols-2 gap-4 text-sm">
            {company.industry && <div><p className="text-white/40 text-xs uppercase">Industry</p><p className="text-white">{company.industry}</p></div>}
            {company.employee_size && <div><p className="text-white/40 text-xs uppercase">Size</p><p className="text-white">{company.employee_size}</p></div>}
            {company.head_office && <div><p className="text-white/40 text-xs uppercase">HQ</p><p className="text-white">{company.head_office}</p></div>}
            {company.since && <div><p className="text-white/40 text-xs uppercase">Since</p><p className="text-white">{company.since}</p></div>}
          </div>
          <div className="md:col-span-2 flex gap-4">
            <button type="button" onClick={() => setEditing(true)} className="px-5 py-2 rounded-lg border border-white/20 text-white font-bold text-sm hover:border-[#fcc636]/40 w-fit">
              Edit company
            </button>
            {onCreateNew && (
              <button type="button" onClick={onCreateNew} className="px-5 py-2 rounded-lg bg-[#fcc636] text-[#2b2b2b] font-bold text-sm hover:bg-[#e6b535] w-fit">
                Create another company
              </button>
            )}
          </div>
        </div>
      )}

      {(editing || !company) && (
        <form onSubmit={handleSubmit} className="p-8 rounded-xl bg-[#1a1a1a] border border-white/10 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">{company ? 'Edit company' : 'Create company'}</h3>
            {company && editing && (
              <button type="button" onClick={() => setEditing(false)} className="text-sm font-bold text-white/50 hover:text-white">
                Cancel
              </button>
            )}
            {!company && onCancel && (
              <button type="button" onClick={onCancel} className="text-sm font-bold text-white/50 hover:text-white">
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-white">Company name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636]" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-white">Logo URL</label>
              <input value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Website</label>
              <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Industry</label>
              <input value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-white">About</label>
              <textarea value={form.about} onChange={(e) => setForm((f) => ({ ...f, about: e.target.value }))} rows={4} className="w-full p-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/70" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Employee size</label>
              <input value={form.employee_size} onChange={(e) => setForm((f) => ({ ...f, employee_size: e.target.value }))} placeholder="51-200" className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Head office</label>
              <input value={form.head_office} onChange={(e) => setForm((f) => ({ ...f, head_office: e.target.value }))} className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50" />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold disabled:opacity-50">
              {loading ? 'Saving…' : company ? 'Save changes' : 'Create company'}
            </button>
            {company && editing && (
              <button type="button" onClick={() => setEditing(false)} className="px-6 py-3 rounded-xl border border-white/20 text-white font-bold">
                Cancel
              </button>
            )}
            {!company && onCancel && (
              <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl border border-white/20 text-white font-bold">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
