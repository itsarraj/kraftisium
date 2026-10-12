import { useState, useEffect } from 'react';
import { bffApi, Job, TalentPool, PoolCandidateDetail } from '../../services/bffApi';
import { notifyError, notifySuccess } from '../../lib/toast';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText.trim();
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
};

type Props = {
  companyId: string | null;
  jobs: Job[];
};

export default function RecruiterTalentPoolsTab({ companyId, jobs }: Props) {
  const [pools, setPools] = useState<TalentPool[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newPoolName, setNewPoolName] = useState('');
  
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [candidates, setCandidates] = useState<PoolCandidateDetail[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [poolToDelete, setPoolToDelete] = useState<{ id: string, name: string } | null>(null);

  // Matcher state
  const [activeTab, setActiveTab] = useState<'manage' | 'match'>('manage');
  const [selectedPoolsForMatch, setSelectedPoolsForMatch] = useState<Set<string>>(new Set());
  const [matchJobId, setMatchJobId] = useState<string>('');
  const [matchCustomText, setMatchCustomText] = useState<string>('');
  const [matchMode, setMatchMode] = useState<'job' | 'custom'>('job');
  
  const [matchResults, setMatchResults] = useState<{ candidate: PoolCandidateDetail, score: number }[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadPools();
  }, [companyId]);

  useEffect(() => {
    if (selectedPoolId && activeTab === 'manage') {
      loadCandidates(selectedPoolId);
    }
  }, [selectedPoolId, activeTab]);

  // Both effects above must run on every render regardless of companyId/loading
  // (React's Rules of Hooks) — so these bail-outs come after them, not between.
  if (!companyId) {
    return (
      <p className="text-[#fcc636] text-sm p-6 rounded-xl bg-[#1a1a1a] border border-white/10">
        Create your company profile before managing talent pools.
      </p>
    );
  }

  if (loading) {
    return <div className="text-white/50">Loading talent pools...</div>;
  }

  const loadPools = async () => {
    setLoading(true);
    try {
      const p = await bffApi.listTalentPools(companyId);
      setPools(p);
      if (p.length > 0 && !selectedPoolId) {
        setSelectedPoolId(p[0].id);
      }
    } catch (err: any) {
      notifyError(err.message || 'Failed to load talent pools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    try {
      const pool = await bffApi.createTalentPool(companyId, { name: newPoolName });
      setPools([pool, ...pools]);
      setNewPoolName('');
      setSelectedPoolId(pool.id);
      notifySuccess('Talent pool created!');
    } catch (err: any) {
      notifyError(err.message || 'Failed to create pool');
    }
  };

  const confirmDeletePool = async () => {
    if (!poolToDelete) return;
    const { id } = poolToDelete;
    
    try {
      await bffApi.deleteTalentPool(id, companyId);
      setPools(pools.filter(p => p.id !== id));
      if (selectedPoolId === id) {
        setSelectedPoolId('');
        setCandidates([]);
      }
      const newSet = new Set(selectedPoolsForMatch);
      if (newSet.has(id)) {
        newSet.delete(id);
        setSelectedPoolsForMatch(newSet);
      }
      notifySuccess('Talent pool deleted.');
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete talent pool');
    } finally {
      setPoolToDelete(null);
    }
  };

  const loadCandidates = async (id: string) => {
    setLoadingCandidates(true);
    try {
      const c = await bffApi.listPoolCandidates(id, companyId);
      setCandidates(c);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedPoolId || files.length === 0) return;
    setIsUploading(true);
    setProgress(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await extractTextFromPDF(file);
        const extractedContent = JSON.stringify({ extracted_text: text });
        await bffApi.uploadTalentPoolResume(selectedPoolId, companyId, file, extractedContent, file.name);
        successCount++;
      } catch (err) {
        console.error(`Failed to upload ${file.name}`, err);
        failCount++;
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsUploading(false);
    if (failCount === 0) {
      notifySuccess(`Successfully uploaded ${successCount} resumes to pool!`);
      setFiles([]);
      loadCandidates(selectedPoolId);
    } else {
      notifyError(`Uploaded ${successCount} resumes, but ${failCount} failed.`);
    }
  };

  const handleRunMatch = async () => {
    if (selectedPoolsForMatch.size === 0) {
      notifyError('Please select at least one talent pool to match against.');
      return;
    }
    
    let jobText = '';
    if (matchMode === 'job') {
      if (!matchJobId) {
        notifyError('Please select a job.');
        return;
      }
      const job = jobs.find(j => j.id === matchJobId);
      if (job) {
        jobText = job.position_title + " \n " + job.description;
      }
    } else {
      if (!matchCustomText.trim()) {
        notifyError('Please enter custom criteria.');
        return;
      }
      jobText = matchCustomText;
    }

    setIsMatching(true);
    setMatchResults([]);

    try {
      // Fetch all candidates from selected pools
      const allCandidates: PoolCandidateDetail[] = [];
      for (const poolId of Array.from(selectedPoolsForMatch)) {
        const c = await bffApi.listPoolCandidates(poolId, companyId);
        allCandidates.push(...c);
      }

      // Deduplicate by user_id
      const uniqueCandidates = Array.from(new Map(allCandidates.map(c => [c.user_id, c])).values());
      const userIds = uniqueCandidates.map(c => c.user_id);

      if (userIds.length === 0) {
        notifyError('No candidates found in the selected pools.');
        setIsMatching(false);
        return;
      }

      const res = await bffApi.scorePoolCandidatesCustom(jobText, userIds);
      
      const scored = uniqueCandidates.map(c => ({
        candidate: c,
        score: res.scores[c.user_id] || 0
      })).sort((a, b) => b.score - a.score);

      setMatchResults(scored);
    } catch (err: any) {
      notifyError(err.message || 'Failed to run match');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">Talent Pools</h2>
          <p className="text-sm text-white/50">Manage your candidate database and run AI matches.</p>
        </div>
        <div className="flex gap-2 p-1 bg-[#1a1a1a] rounded-lg border border-white/10">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'manage' ? 'bg-[#2b2b2b] text-[#fcc636]' : 'text-white/50 hover:text-white'}`}
          >
            Manage Pools
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'match' ? 'bg-[#2b2b2b] text-[#fcc636]' : 'text-white/50 hover:text-white'}`}
          >
            AI Matcher
          </button>
        </div>
      </div>

      {activeTab === 'manage' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pools Sidebar */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/10 shadow-brand space-y-4">
              <h3 className="font-bold text-white/80">Your Pools</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Pool Name"
                  value={newPoolName}
                  onChange={e => setNewPoolName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#2b2b2b] border border-white/20 rounded-lg text-white text-sm outline-none focus:border-[#fcc636] transition-colors"
                />
                <button
                  onClick={handleCreatePool}
                  className="px-3 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-lg hover:bg-[#e6b535] transition-colors"
                >
                  +
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {pools.length === 0 ? (
                  <p className="text-sm text-white/40">No pools created yet.</p>
                ) : (
                  pools.map(p => (
                    <div key={p.id} className="flex gap-2">
                      <button
                        onClick={() => setSelectedPoolId(p.id)}
                        className={`flex-1 text-left px-4 py-3 rounded-xl transition-all ${
                          selectedPoolId === p.id
                            ? 'bg-[#2b2b2b] border border-[#fcc636] text-[#fcc636]'
                            : 'bg-transparent border border-transparent text-white/70 hover:bg-[#2b2b2b]'
                        }`}
                      >
                        <p className="font-bold truncate">{p.name}</p>
                      </button>
                      <button
                        onClick={() => setPoolToDelete({ id: p.id, name: p.name })}
                        className="p-3 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors shrink-0"
                        title="Delete Pool"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Pool Details */}
          <div className="md:col-span-2 space-y-6">
            {selectedPoolId ? (
              <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-brand space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{pools.find(p => p.id === selectedPoolId)?.name}</h3>
                  <span className="px-3 py-1 bg-[#2b2b2b] rounded-full text-xs font-bold text-[#fcc636]">
                    {candidates.length} Candidates
                  </span>
                </div>

                {/* Upload Area */}
                <div className="space-y-4">
                  <h4 className="font-bold text-white/70">Add Candidates to Pool</h4>
                  <div className="flex flex-col gap-4 p-4 border border-dashed border-white/20 rounded-xl bg-[#2b2b2b]/50 hover:border-white/40 transition-colors">
                    <input 
                      type="file" 
                      multiple 
                      accept="application/pdf"
                      onChange={e => {
                        if (e.target.files) {
                          setFiles([...files, ...Array.from(e.target.files).filter(f => f.type === 'application/pdf')]);
                        }
                      }}
                      className="hidden" 
                      id="pool-file-upload"
                    />
                    <label 
                      htmlFor="pool-file-upload"
                      className="self-start px-4 py-2 bg-[#fcc636]/10 text-[#fcc636] font-bold rounded-lg cursor-pointer hover:bg-[#fcc636]/20 transition-colors"
                    >
                      Browse PDF Resumes
                    </label>
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-white/70">{files.length} files selected</div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="px-4 py-2 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-lg hover:bg-[#e6b535] transition-colors disabled:opacity-50"
                          >
                            {isUploading ? `Uploading ${progress}%` : 'Upload to Pool'}
                          </button>
                          <button
                            onClick={() => setFiles([])}
                            disabled={isUploading}
                            className="px-4 py-2 text-white/50 hover:text-red-400 font-bold transition-colors disabled:opacity-50"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Candidates List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-white/70">Candidates</h4>
                  {loadingCandidates ? (
                    <div className="text-white/50 text-sm">Loading candidates...</div>
                  ) : candidates.length === 0 ? (
                    <div className="text-white/40 text-sm p-4 bg-[#2b2b2b] rounded-xl text-center">No candidates in this pool yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                      {candidates.map(c => (
                        <div key={c.user_id} className="p-4 bg-[#2b2b2b] rounded-xl border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-[#fcc636]">{c.candidate_name || 'Unknown'}</p>
                            <p className="text-xs text-white/50">{c.candidate_email || 'No email'}</p>
                          </div>
                          {c.resume_file_name && (
                            <span className="text-xs text-white/40 bg-[#1a1a1a] px-2 py-1 rounded">
                              {c.resume_file_name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-10 bg-[#1a1a1a] rounded-2xl border border-white/10 text-white/50">
                Select a pool to view details
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'match' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-brand space-y-6">
              <div>
                <h3 className="font-bold text-white mb-4">1. Select Talent Pools</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {pools.map(p => (
                    <label key={p.id} className="flex items-center gap-3 p-3 bg-[#2b2b2b] rounded-xl cursor-pointer hover:bg-[#333] transition-colors border border-white/5">
                      <input 
                        type="checkbox" 
                        checked={selectedPoolsForMatch.has(p.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedPoolsForMatch);
                          if (e.target.checked) newSet.add(p.id);
                          else newSet.delete(p.id);
                          setSelectedPoolsForMatch(newSet);
                        }}
                        className="w-4 h-4 accent-[#fcc636]"
                      />
                      <span className="font-bold text-sm">{p.name}</span>
                    </label>
                  ))}
                  {pools.length === 0 && <p className="text-white/40 text-sm">No talent pools available.</p>}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-white mb-4">2. Match Criteria</h3>
                <div className="flex gap-2 p-1 bg-[#2b2b2b] rounded-lg mb-4">
                  <button 
                    onClick={() => setMatchMode('job')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${matchMode === 'job' ? 'bg-[#1a1a1a] text-[#fcc636]' : 'text-white/50 hover:text-white'}`}
                  >
                    Select Job
                  </button>
                  <button 
                    onClick={() => setMatchMode('custom')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${matchMode === 'custom' ? 'bg-[#1a1a1a] text-[#fcc636]' : 'text-white/50 hover:text-white'}`}
                  >
                    Custom Text
                  </button>
                </div>

                {matchMode === 'job' ? (
                  <select 
                    value={matchJobId}
                    onChange={e => setMatchJobId(e.target.value)}
                    className="w-full h-12 px-4 bg-[#2b2b2b] border border-white/20 rounded-lg text-white font-bold outline-none focus:border-[#fcc636] transition-colors"
                  >
                    <option value="" disabled>-- Select a Job --</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.position_title}</option>
                    ))}
                  </select>
                ) : (
                  <textarea 
                    value={matchCustomText}
                    onChange={e => setMatchCustomText(e.target.value)}
                    placeholder="Enter job description, keywords, or requirements..."
                    className="w-full h-32 p-4 bg-[#2b2b2b] border border-white/20 rounded-lg text-white text-sm outline-none focus:border-[#fcc636] transition-colors resize-none"
                  />
                )}
              </div>

              <button
                onClick={handleRunMatch}
                disabled={isMatching || selectedPoolsForMatch.size === 0}
                className="w-full py-4 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-xl hover:bg-[#e6b535] transition-colors disabled:opacity-50"
              >
                {isMatching ? 'Running AI Matcher...' : 'Rank Candidates'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 shadow-brand h-full">
              <h3 className="font-bold text-white mb-4">Match Results</h3>
              {isMatching ? (
                <div className="flex flex-col items-center justify-center h-80 rounded-2xl bg-black/40 border border-[#fcc636]/30 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#1a1a1a_100%)] z-10 pointer-events-none" />
                  
                  {/* Radar Circles */}
                  <div className="absolute w-64 h-64 border border-[#fcc636]/10 rounded-full flex items-center justify-center">
                    <div className="absolute w-48 h-48 border border-[#fcc636]/20 rounded-full flex items-center justify-center">
                      <div className="absolute w-32 h-32 border border-[#fcc636]/30 rounded-full flex items-center justify-center">
                        <div className="absolute w-2 h-2 bg-[#fcc636] rounded-full shadow-[0_0_10px_#fcc636]" />
                      </div>
                    </div>
                  </div>

                  {/* Radar Sweeper */}
                  <div className="absolute w-32 h-32 origin-bottom-right bottom-1/2 right-1/2 bg-gradient-to-br from-[#fcc636]/40 to-transparent animate-[spin_2s_linear_infinite]" style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 0)' }} />

                  {/* Random Blips */}
                  <div className="absolute w-1.5 h-1.5 bg-[#fcc636] rounded-full animate-ping shadow-[0_0_8px_#fcc636]" style={{ top: '30%', left: '40%' }} />
                  <div className="absolute w-1 h-1 bg-[#fcc636] rounded-full animate-ping shadow-[0_0_8px_#fcc636]" style={{ top: '60%', left: '70%', animationDelay: '0.5s' }} />
                  <div className="absolute w-2 h-2 bg-[#fcc636] rounded-full animate-ping shadow-[0_0_8px_#fcc636]" style={{ top: '40%', left: '60%', animationDelay: '1.2s' }} />

                  <div className="relative z-20 mt-32 flex flex-col items-center gap-2">
                    <p className="text-[#fcc636] font-mono text-sm uppercase tracking-widest font-bold animate-pulse">Unleashing AI...</p>
                    <p className="text-white/60 text-xs font-mono">Scanning semantic matches</p>
                  </div>
                </div>
              ) : matchResults.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {matchResults.map((r, idx) => (
                    <div key={r.candidate.user_id} className="p-4 bg-[#2b2b2b] rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] text-white/50 font-bold flex items-center justify-center text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[#fcc636]">{r.candidate.candidate_name || 'Unknown'}</p>
                          <p className="text-xs text-white/50">{r.candidate.candidate_email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-white">{Math.round(r.score * 100)}%</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/40">Match</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-white/30 border-2 border-dashed border-white/10 rounded-2xl">
                  <p>Run a match to see ranked candidates here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {poolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#2b2b2b] rounded-2xl p-6 border border-white/10 shadow-brand flex flex-col gap-6">
            <div className="flex flex-col gap-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Delete Talent Pool?</h2>
              <p className="text-sm text-white/60">
                Are you sure you want to delete <span className="font-bold text-white">"{poolToDelete.name}"</span>? 
                This action cannot be undone and will remove all candidate associations from this pool.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setPoolToDelete(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePool}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Delete Pool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
