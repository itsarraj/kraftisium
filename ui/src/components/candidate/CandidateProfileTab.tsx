import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { bffApi } from '../../services/bffApi';

type Props = {
  user: any;
  bio: string;
  setBio: (bio: string) => void;
  profileForm: any;
  setProfileForm: (f: any) => void;
  profileError: string;
  profileSuccess: string;
  profileLoading: boolean;
  onUpdateProfile: (e: React.FormEvent) => void;
  resumes: any[];
  resumeLoading: boolean;
  resumeError: string;
  resumeUploading: boolean;
  onUploadResume: (e: React.ChangeEvent<HTMLInputElement>) => void;

  employerForm: any;
  setEmployerForm: (f: any) => void;
  employerError: string;
  employerSuccess: string;
  employerLoading: boolean;
  onUpdateEmployerProfile: (e: React.FormEvent) => void;
};

const BIO_PLACEHOLDER = `## About Me\n2-3 sentences about your background, interests, and what you're looking for.\n\n## Key Skills\n• Skill 1\n• Skill 2\n• Skill 3\n\n## Career Goals\n• Short-term goal\n• Long-term goal\n\n## Why I'm a Good Fit\nWhat makes you stand out? Relevant experience, achievements, or motivation.`;

export default function CandidateProfileTab({
  user,
  bio,
  setBio,
  profileForm,
  setProfileForm,
  profileError,
  profileSuccess,
  profileLoading,
  onUpdateProfile,
  resumes,
  resumeLoading,
  resumeError,
  resumeUploading,
  onUploadResume,

  employerForm,
  setEmployerForm,
  employerError,
  employerSuccess,
  employerLoading,
  onUpdateEmployerProfile,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [topMatches, setTopMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    if (user?.id && user?.role === 'user') {
      setMatchesLoading(true);
      bffApi.getSuggestedJobs(user.id)
        .then((jobs) => {
          setTopMatches(jobs.slice(0, 4));
        })
        .catch(console.error)
        .finally(() => setMatchesLoading(false));
    }
  }, [user?.id, user?.role]);

  const profileStrength = useMemo(() => {
    let score = 0;
    if (user?.name && user.name.trim() !== '') score += 30;
    if (bio && bio.trim() !== '' && bio !== BIO_PLACEHOLDER) score += 30;
    if (resumes && resumes.length > 0) score += 40;
    return score;
  }, [user?.name, bio, resumes]);

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black text-white tracking-tight">My Profile</h2>
        
        {user?.role === 'user' && (
          <div className="flex items-center gap-4 bg-[#1a1a1a] px-4 py-3 rounded-xl border border-white/10 shadow-brand w-full md:w-auto">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={profileStrength === 100 ? "text-[#fcc636]" : "text-[#fcc636]/70"}
                  strokeWidth="3"
                  strokeDasharray={`${profileStrength}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {profileStrength === 100 ? (
                  <span className="text-xl">🔥</span>
                ) : (
                  <span className="text-xs font-bold text-white">{profileStrength}%</span>
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white uppercase tracking-wider">Profile Power</span>
              {profileStrength === 100 ? (
                <span className="text-xs text-[#fcc636] font-bold">All-Star! Expect 3x views.</span>
              ) : (
                <span className="text-xs text-white/50">Complete profile to stand out.</span>
              )}
            </div>
          </div>
        )}

        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-3 rounded-xl bg-[#2b2b2b] text-white border border-white/10 font-bold hover:bg-[#333] transition-all shadow-brand whitespace-nowrap"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Top AI Job Matches */}
      {(user?.role === 'user' || user?.role === 'admin') && !isEditing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#fcc636] flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              Top Job Matches For You
            </h3>
            <Link to="/jobs" className="text-xs text-white/50 hover:text-white">View all jobs</Link>
          </div>
          {matchesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-32 rounded-xl bg-[#2b2b2b]/50 animate-pulse border border-white/5" />
              <div className="h-32 rounded-xl bg-[#2b2b2b]/50 animate-pulse border border-white/5" />
            </div>
          ) : topMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topMatches.map((job) => (
                <Link key={job.id} to={`/jobs/${job.id}`} className="block relative p-5 rounded-xl bg-[#1a1a1a] border border-[#fcc636]/30 hover:border-[#fcc636] transition-all overflow-hidden shadow-brand">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#fcc636]/10 to-transparent pointer-events-none" />
                  <div className="relative z-10">
                    <h4 className="font-bold text-white text-base truncate">{job.position_title}</h4>
                    <p className="text-sm text-[#fcc636] font-semibold mt-1">{job.company_name}</p>
                    <p className="text-xs text-white/40 mt-1">{job.location} · {job.employment_type}</p>
                    {job.match_score !== undefined && (
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-[#fcc636] rounded-full" style={{ width: `${Math.min(100, Math.max(0, job.match_score))}%` }} />
                        </div>
                        <span className="text-xs font-bold text-[#fcc636]">{Math.round(job.match_score)}% Match</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-white/10 text-center">
              <p className="text-sm text-white/50">Upload your resume and complete your profile to get AI-powered job matches.</p>
            </div>
          )}
        </div>
      )}

      <div className="p-8 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-brand space-y-8">
        {profileError && <p className="text-red-400 text-sm">{profileError}</p>}
        {profileSuccess && <p className="text-green-400 text-sm">{profileSuccess}</p>}
        
        {isEditing ? (
          <form className="space-y-6" onSubmit={(e) => { onUpdateProfile(e); setIsEditing(false); }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-white">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f: any) => ({ ...f, name: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-[#fcc636] outline-none shadow-brand"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white">Email</label>
                <p className="h-11 px-4 py-2.5 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/50">
                  {user?.email || '-'}
                </p>
              </div>
            </div>

            {(user?.role === 'user' || user?.role === 'admin') && (
              <>
                <div className="h-px bg-white/10 my-6" />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-white">Bio</label>
                      <button
                        type="button"
                        onClick={() => setBio(BIO_PLACEHOLDER)}
                        className="text-xs text-[#fcc636] hover:underline"
                      >
                        Use template
                      </button>
                    </div>
                    <p className="text-xs text-white/50">Used for AI matching along with your resume.</p>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={BIO_PLACEHOLDER}
                      rows={12}
                      className="w-full p-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white/80 font-mono text-sm outline-none shadow-brand"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-8 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold shadow-brand hover:bg-[#e6b535] transition-all disabled:opacity-50"
              >
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-8 py-3 rounded-xl bg-[#2b2b2b] text-white border border-white/10 font-bold shadow-brand hover:bg-[#333] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-white/50">Full Name</p>
                <p className="text-lg text-white font-medium">{user?.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-white/50">Email</p>
                <p className="text-lg text-white font-medium">{user?.email || '-'}</p>
              </div>
            </div>

            {(user?.role === 'user' || user?.role === 'admin') && (
              <>
                <div className="h-px bg-white/10 my-6" />
                <div className="space-y-2">
                  <p className="text-sm text-white/50">Bio</p>
                  {bio ? (
                    <p className="text-white/80 whitespace-pre-wrap">{bio}</p>
                  ) : (
                    <p className="text-white/40 italic">No bio yet. Edit profile to add one.</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Resume Section */}
      {(user?.role === 'user' || user?.role === 'admin') && (
        <div className="p-8 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-brand space-y-6">
          <h3 className="text-lg font-bold text-white">Your Resume</h3>
          <p className="text-sm text-white/50">Your latest resume is used when applying to jobs.</p>
          
          {resumeError && <p className="text-sm text-red-400">{resumeError}</p>}
          
          {resumeLoading ? (
            <div className="p-4 rounded-lg bg-[#2b2b2b]/50 border border-white/5 animate-pulse w-full h-20" />
          ) : resumes.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-white/20 text-center">
              <p className="text-sm text-white/50 mb-4">No resumes uploaded yet.</p>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-[#2b2b2b] border border-[#fcc636]/30 shadow-brand flex justify-between items-center">
              <div>
                <p className="text-base font-bold text-[#fcc636]">{resumes[0].file_name || resumes[0].title}</p>
                <p className="text-xs text-white/50 mt-1">
                  {resumes[0].file_size ? `${(resumes[0].file_size / 1024).toFixed(1)} KB` : ''}
                  {resumes[0].file_size ? ' · ' : ''}
                  Uploaded {new Date(resumes[0].created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-[#fcc636]/10 text-[#fcc636] text-[10px] font-bold uppercase tracking-wider">Active</span>
            </div>
          )}

          <div className="mt-4">
            <label className="inline-block cursor-pointer px-6 py-2.5 rounded-lg bg-[#2b2b2b] text-[#fcc636] border border-[#fcc636]/30 font-bold text-sm hover:bg-[#fcc636]/10 transition-all">
              {resumeUploading ? 'Uploading...' : resumes.length > 0 ? 'Upload New Resume' : 'Upload Resume'}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={onUploadResume}
                disabled={resumeUploading}
              />
            </label>
            <p className="text-xs text-white/40 mt-2">PDF files only (max 5MB)</p>
          </div>
        </div>
      )}

      {/* Employer Profile */}
      {(user?.role === 'recruiter' || user?.role === 'admin') && (
        <div className="p-8 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-brand space-y-6">
          <h3 className="text-lg font-bold text-white">Employer Details</h3>
          <p className="text-sm text-white/50">Used for recruiter identity. Company settings are in the recruiter dashboard.</p>
          
          {employerError && <p className="text-red-400 text-sm">{employerError}</p>}
          {employerSuccess && <p className="text-green-400 text-sm">{employerSuccess}</p>}

          <form className="space-y-4" onSubmit={onUpdateEmployerProfile}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-white">Job Title</label>
                <input
                  type="text"
                  value={employerForm.job_title}
                  onChange={(e) => setEmployerForm((f: any) => ({ ...f, job_title: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none"
                  placeholder="e.g. Hiring Manager"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white">Mobile</label>
                <input
                  type="text"
                  value={employerForm.mobile}
                  onChange={(e) => setEmployerForm((f: any) => ({ ...f, mobile: e.target.value }))}
                  className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Company Type</label>
              <select
                value={employerForm.company_type}
                onChange={(e) => setEmployerForm((f: any) => ({ ...f, company_type: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none"
              >
                <option value="company">Direct Employer</option>
                <option value="agency">Recruitment Agency</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={employerLoading}
              className="px-6 py-2.5 rounded-lg bg-white text-[#2b2b2b] font-bold mt-4 disabled:opacity-50"
            >
              {employerLoading ? 'Saving...' : 'Update Details'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
