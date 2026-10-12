import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useNavigate } from 'react-router-dom'
import { bffApi, Job } from '../services/bffApi'
import { notifyError, notifySuccess } from '../lib/toast'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    return fullText.trim()
  } catch (error) {
    console.error('PDF extraction error:', error)
    return ''
  }
}

export default function StandaloneMatcherPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('custom')
  const [customJd, setCustomJd] = useState<string>('')
  
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const [results, setResults] = useState<{ file: File; score: number }[]>([])

  useEffect(() => {
    async function loadJobs() {
      try {
        const companies = await bffApi.listMyCompanies();
        if (companies.length > 0) {
          const companyJobs = await bffApi.listRecruiterJobs(companies[0].id);
          setJobs(companyJobs.filter(j => j.status !== 'closed'));
        }
      } catch (err) {
        console.error('Failed to load jobs', err);
      }
    }
    loadJobs();
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    )
    setFiles(prev => [...prev, ...droppedFiles])
    setResults([])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      )
      setFiles(prev => [...prev, ...selectedFiles])
      setResults([])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setResults([])
  }

  const getJobText = () => {
    if (selectedJobId === 'custom') {
      return customJd.trim()
    }
    const job = jobs.find(j => j.id === selectedJobId)
    if (!job) return ''
    return [job.position_title, job.company_name, job.location, job.employment_type, job.description].filter(Boolean).join('\n')
  }

  const handleMatch = async () => {
    const jobText = getJobText()
    if (!jobText) {
      notifyError("Please provide a job description or select a job.")
      return
    }
    if (files.length === 0) {
      notifyError("Please upload at least one resume.")
      return
    }

    setIsUploading(true)
    setProgress(0)
    setResults([])

    try {
      // Extract text from all PDFs
      const texts: string[] = []
      for (let i = 0; i < files.length; i++) {
        texts.push(await extractTextFromPDF(files[i]))
        setProgress(Math.round(((i + 1) / files.length) * 50)) // first 50% is extraction
      }

      // Call API
      const res = await bffApi.quickMatchResumes(jobText, texts)
      setProgress(100)

      const paired = files.map((f, i) => ({ file: f, score: res.scores[i] || 0 }))
      paired.sort((a, b) => b.score - a.score)
      setResults(paired)
      notifySuccess(`Successfully ranked ${files.length} candidates!`)
    } catch (err) {
      console.error(err)
      notifyError("Failed to match resumes. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Quick Match Calculator - Kraftisium</title>
      </Helmet>
      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate(-1)}
              className="text-[#fcc636] hover:text-[#e6b535] flex items-center gap-2 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Back
            </button>
            <h1 className="text-3xl font-bold">Bulk Resume Matcher</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Job Description */}
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-brand flex flex-col h-[600px]">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#fcc636] mb-2">1. Define the Job</h2>
                <p className="text-sm text-white/60">Select an existing job from your ATS, or paste a custom description.</p>
              </div>

              <div className="space-y-4 flex-grow flex flex-col">
                <select 
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full h-12 px-4 bg-[#2b2b2b] border border-white/20 rounded-lg text-white font-bold outline-none focus:border-[#fcc636] transition-colors"
                >
                  <option value="custom">-- Paste a Custom Job Description --</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.position_title} ({job.location})</option>
                  ))}
                </select>

                {selectedJobId === 'custom' && (
                  <textarea
                    value={customJd}
                    onChange={(e) => setCustomJd(e.target.value)}
                    placeholder="Paste job description here..."
                    className="w-full flex-grow p-4 bg-[#2b2b2b] border border-white/20 rounded-lg text-white text-sm outline-none focus:border-[#fcc636] transition-colors resize-none"
                  />
                )}
                {selectedJobId !== 'custom' && (
                  <div className="flex-grow flex items-center justify-center p-4 bg-[#2b2b2b] border border-white/10 rounded-lg">
                    <p className="text-white/40 text-center">Using existing job details from your ATS.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Resumes */}
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-brand flex flex-col h-[600px]">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#fcc636] mb-2">2. Upload Resumes</h2>
                <p className="text-sm text-white/60">Upload multiple PDF files to see who matches best.</p>
              </div>

              <div className="flex-grow flex flex-col">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${
                    isDragOver ? 'border-[#fcc636] bg-[#fcc636]/5' : 'border-white/20 hover:border-white/40 bg-[#2b2b2b]/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#fcc636]">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p className="text-sm font-bold">Drag & drop PDFs here</p>
                    <input 
                      type="file" 
                      multiple 
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden" 
                      id="file-upload-quick"
                    />
                    <label 
                      htmlFor="file-upload-quick"
                      className="text-xs text-[#fcc636] hover:underline cursor-pointer"
                    >
                      Browse files
                    </label>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2 custom-scrollbar border border-white/5 bg-[#2b2b2b]/30 rounded-lg p-2">
                  {files.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-white/20 text-sm">
                      No files selected
                    </div>
                  ) : (
                    files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-[#2b2b2b] rounded border border-white/5">
                        <span className="text-sm truncate pr-2 max-w-[200px]" title={file.name}>{file.name}</span>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="text-white/40 hover:text-red-400 transition-colors"
                          disabled={isUploading}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {files.length > 0 && (
                  <div className="flex justify-between items-center mt-2 text-xs text-white/50 px-1">
                    <span>{files.length} file{files.length !== 1 && 's'}</span>
                    <button onClick={() => setFiles([])} disabled={isUploading} className="hover:text-red-400">Clear all</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleMatch}
              disabled={isUploading || files.length === 0}
              className="px-12 py-4 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-xl text-xl hover:bg-[#e6b535] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-brand"
            >
              {isUploading ? `Analyzing ${progress}%...` : 'Rank Candidates'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-brand">
              <h2 className="text-2xl font-bold text-white mb-6">Leaderboard</h2>
              <div className="space-y-4">
                {results.map((res, i) => {
                  const percent = Math.round(res.score * 100)
                  return (
                    <div key={i} className="flex items-center gap-6 p-4 bg-[#2b2b2b] rounded-xl border border-white/5 hover:border-[#fcc636]/30 transition-colors">
                      <div className="flex flex-col items-center justify-center w-16 shrink-0">
                        <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Rank</span>
                        <span className="text-3xl font-bold text-[#fcc636]">#{i + 1}</span>
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-lg truncate text-white" title={res.file.name}>{res.file.name}</h3>
                        <p className="text-sm text-white/40">{(res.file.size / 1024).toFixed(1)} KB</p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-2xl font-bold text-white">{percent}%</span>
                          <p className="text-xs text-[#fcc636] uppercase tracking-widest font-bold">Match Score</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
