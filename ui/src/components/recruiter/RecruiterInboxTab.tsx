import { useMemo, useState } from 'react';
import ApplicantCard from './ApplicantCard';
import CandidateDetailModal from './CandidateDetailModal';
import {
  RecruiterInboxApplication,
  APPLICATION_STATUSES,
  ApplicationDetailed,
} from '../../services/bffApi';
import { STATUS_META, countByStatus } from './pipelineUtils';

type Props = {
  inbox: RecruiterInboxApplication[];
  loading: boolean;
  onShortlist: (id: string) => void;
  onReject: (id: string) => void;
  onViewResume: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
};

export default function RecruiterInboxTab({
  inbox,
  loading,
  onShortlist,
  onReject,
  onViewResume,
  onStatusChange,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'match'>('date');
  const [selectedApp, setSelectedApp] = useState<RecruiterInboxApplication | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: inbox.length };
    APPLICATION_STATUSES.forEach((s) => {
      counts[s] = countByStatus(inbox as unknown as { status: string }[], s);
    });
    return counts;
  }, [inbox]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? inbox : inbox.filter((a) => a.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortBy === 'match') {
        return (b.match_score ?? 0) - (a.match_score ?? 0);
      }
      return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
    });
    return list;
  }, [inbox, statusFilter, sortBy]);

  const modalApp = selectedApp
    ? inbox.find((a) => a.id === selectedApp.id) || selectedApp
    : null;

  return (
    <div className="flex flex-col gap-6 min-h-[480px]">
      <div className="flex-grow space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', ...APPLICATION_STATUSES] as const).map((s) => {
              const label = s === 'all' ? 'All' : STATUS_META[s].label;
              const count = statusCounts[s] ?? 0;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                    statusFilter === s
                      ? 'border-[#fcc636] text-[#fcc636] bg-[#2b2b2b]'
                      : 'border-white/10 text-white/60 hover:border-white/30'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'match')}
            className="h-10 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] text-sm"
          >
            <option value="date">Newest</option>
            <option value="match">Best match</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-white/50 text-center py-16 border border-dashed border-white/10 rounded-xl">
            No applications found across any managed companies.
          </p>
        ) : (
          filtered.map((app) => (
            <div key={app.id} className="space-y-2 max-w-3xl">
              <ApplicantCard
                app={app as unknown as ApplicationDetailed}
                onShortlist={() => onShortlist(app.id)}
                onReject={() => onReject(app.id)}
                onViewResume={() => onViewResume(app.id)}
                onClick={() => setSelectedApp(app)}
              />
              <select
                value={app.status}
                onChange={(e) => onStatusChange(app.id, e.target.value)}
                className="ml-1 h-9 px-3 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] text-xs font-bold"
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {/* Candidate Details Modal */}
      {selectedApp && (
        <CandidateDetailModal
          app={modalApp as unknown as ApplicationDetailed}
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          onStatusChange={(status) => onStatusChange(selectedApp.id, status)}
          onViewResume={() => onViewResume(selectedApp.id)}
        />
      )}
    </div>
  );
}
