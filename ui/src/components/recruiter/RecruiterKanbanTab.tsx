import { useMemo, useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import PipelineApplicantCard from './PipelineApplicantCard';
import CandidateDetailModal from './CandidateDetailModal';
import {
  APPLICATION_STATUSES,
  ApplicationDetailed,
  Job,
} from '../../services/bffApi';
import CandidateCardSkeleton from '../skeletons/CandidateCardSkeleton';
import { STATUS_META, countByStatus } from './pipelineUtils';

const COLUMNS = [
  { id: 'applied', label: 'Applied' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview', label: 'Interview' },
  { id: 'hired', label: 'Hired' },
] as const;

type Props = {
  jobs: Job[];
  selectedJobId: string;
  onSelectJob: (id: string) => void;
  applications: ApplicationDetailed[];
  loading: boolean;
  onStatusChange: (id: string, status: string) => void;
  onViewResume: (id: string) => void;
};

export default function RecruiterKanbanTab({
  jobs,
  selectedJobId,
  onSelectJob,
  applications,
  loading,
  onStatusChange,
  onViewResume,
}: Props) {
  const [selectedApp, setSelectedApp] = useState<ApplicationDetailed | null>(null);
  const [optimisticApps, setOptimisticApps] = useState<ApplicationDetailed[]>(applications);
  const [justHiredId, setJustHiredId] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticApps(applications);
  }, [applications]);

  const activeApps = optimisticApps.filter((a) => a.status !== 'rejected');
  const rejectedApps = optimisticApps.filter((a) => a.status === 'rejected');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: optimisticApps.length };
    APPLICATION_STATUSES.forEach((s) => {
      counts[s] = countByStatus(optimisticApps, s);
    });
    return counts;
  }, [optimisticApps]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const modalApp = selectedApp
    ? optimisticApps.find((a) => a.id === selectedApp.id) || selectedApp
    : null;

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    setOptimisticApps((prev) =>
      prev.map((app) => (app.id === draggableId ? { ...app, status: newStatus } : app))
    );
    onStatusChange(draggableId, newStatus);

    if (newStatus === 'hired') {
      setJustHiredId(draggableId);
      setTimeout(() => setJustHiredId(null), 3000);
    }
  };

  return (
    <div className="space-y-6 min-w-0 relative">
      {justHiredId && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl bg-black/20 backdrop-blur-sm">
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {/* Confetti Elements */}
            <div className="absolute w-full h-full" style={{ perspective: '1000px' }}>
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className={`absolute w-3 h-3 ${i % 2 === 0 ? 'bg-[#fcc636]' : 'bg-[#ffaa00]'} rounded-sm animate-[ping_1s_ease-out_infinite]`} 
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random()}s`,
                    transform: `translateZ(${Math.random() * 500}px) rotate(${Math.random() * 360}deg)`
                  }}
                />
              ))}
            </div>
            
            {/* Central Celebration Banner */}
            <div className="z-10 animate-[zoom-in_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)] flex flex-col items-center">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#fcc636] to-[#ffaa00] drop-shadow-[0_0_15px_rgba(252,198,54,0.5)]">
                Candidate Hired!
              </h2>
              <p className="text-white font-bold mt-4 text-lg bg-black/50 px-6 py-2 rounded-full border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                AI matching helped you close this role instantly. ⚡
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-[#1a1a1a] border border-white/10 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <label htmlFor="pipeline-job-select" className="text-sm font-bold text-white/70 shrink-0">
            Job
          </label>
          <select
            id="pipeline-job-select"
            value={selectedJobId}
            onChange={(e) => onSelectJob(e.target.value)}
            className="h-10 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] font-medium w-full sm:max-w-md"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.position_title}
              </option>
            ))}
          </select>
          {selectedJob && (
            <p className="text-xs text-white/40 sm:ml-auto">
              {selectedJob.location} · {selectedJob.employment_type}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg bg-[#2b2b2b] border border-white/10 text-center sm:text-left">
            <p className="text-lg font-bold text-white">{statusCounts.all}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Total</p>
          </div>
          {APPLICATION_STATUSES.map((s) => (
            <div
              key={s}
              className={`px-3 py-2 rounded-lg border text-center sm:text-left ${STATUS_META[s].badge} ${STATUS_META[s].border}`}
            >
              <p className="text-lg font-bold">{statusCounts[s] ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wide opacity-80">{STATUS_META[s].label}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="overflow-x-auto -mx-1 px-1 pb-2 mt-6">
          <div className="flex gap-4 min-w-[min(100%,72rem)]">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-1 min-w-[280px] max-w-[320px] shrink-0 bg-[#1a1a1a] rounded-xl border border-white/5 flex flex-col max-h-[800px]">
                <div className="p-3 border-b border-white/5 bg-[#2b2b2b]/30 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">{col.label}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  <CandidateCardSkeleton />
                  <CandidateCardSkeleton />
                  <CandidateCardSkeleton />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : applications.length === 0 ? (
        <p className="text-white/50 text-center py-20 border border-dashed border-white/10 rounded-xl">
          No applications for this job yet.
        </p>
      ) : (
        <>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto -mx-1 px-1 pb-2">
              <div className="flex gap-4 min-w-[min(100%,72rem)]">
                {COLUMNS.map((col) => {
                  const cards = activeApps.filter((a) => a.status === col.id);
                  const meta = STATUS_META[col.id];
                  return (
                    <section
                      key={col.id}
                      className={`flex flex-col w-72 shrink-0 rounded-xl bg-[#1a1a1a] border ${meta.border} overflow-hidden`}
                    >
                      <header className="px-3 py-3 border-b border-white/5 bg-[#1a1a1a]/90">
                        <p className="text-xs font-bold uppercase tracking-wide text-white/70">
                          {col.label}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">{cards.length} candidates</p>
                      </header>
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 p-3 space-y-3 max-h-[min(65vh,520px)] overflow-y-auto transition-colors ${
                              snapshot.isDraggingOver ? 'bg-white/5' : ''
                            }`}
                          >
                            {cards.map((app, index) => (
                              <Draggable key={app.id} draggableId={app.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`transition-all ${
                                      snapshot.isDragging ? 'shadow-2xl scale-[1.02] rotate-2 z-50 ring-1 ring-[#fcc636]/50' : ''
                                    }`}
                                    style={provided.draggableProps.style}
                                  >
                                    <PipelineApplicantCard
                                      app={app}
                                      onStatusChange={(status) => onStatusChange(app.id, status)}
                                      onViewResume={() => onViewResume(app.id)}
                                      onClick={() => setSelectedApp(app)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {cards.length === 0 && !snapshot.isDraggingOver && (
                              <p className="text-[11px] text-white/30 text-center py-8">Empty</p>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </section>
                  );
                })}
              </div>
            </div>
          </DragDropContext>

          {rejectedApps.length > 0 && (
            <section className="rounded-xl bg-[#1a1a1a] border border-red-500/20 overflow-hidden">
              <header className="px-4 py-3 border-b border-red-500/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
                  Rejected · {rejectedApps.length}
                </h3>
                <p className="text-xs text-white/40">
                  Change status to reconsider a candidate
                </p>
              </header>
              <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                {rejectedApps.map((app) => (
                  <PipelineApplicantCard
                    key={app.id}
                    app={app}
                    variant="detail"
                    onStatusChange={(status) => onStatusChange(app.id, status)}
                    onViewResume={() => onViewResume(app.id)}
                    onRestore={() => onStatusChange(app.id, 'applied')}
                    onClick={() => setSelectedApp(app)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Candidate Details Modal */}
      {selectedApp && (
        <CandidateDetailModal
          app={modalApp}
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          onStatusChange={(status) => onStatusChange(selectedApp.id, status)}
          onViewResume={() => onViewResume(selectedApp.id)}
        />
      )}
    </div>
  );
}
