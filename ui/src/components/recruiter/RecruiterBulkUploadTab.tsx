import React, { useState, useEffect } from 'react'
import { bffApi, Job } from '../../services/bffApi'
import { notifyError, notifySuccess } from '../../lib/toast'
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

type Props = {
  companyId: string | null
  jobs: Job[]
  initialJobId?: string
  onSuccess?: () => void
}

export default function RecruiterBulkUploadTab({ companyId, jobs, initialJobId, onSuccess }: Props) {
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId || '')
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (initialJobId) setSelectedJobId(initialJobId)
  }, [initialJobId])

  if (!companyId) {
    return (
      <p className="text-[#fcc636] text-sm p-6 rounded-xl bg-[#1a1a1a] border border-white/10">
        Create your company profile before uploading resumes.
      </p>
    );
  }

  const activeJobs = jobs.filter(j => j.status !== 'closed')

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
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        file => file.type === 'application/pdf'
      )
      setFiles(prev => [...prev, ...selectedFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (!selectedJobId || files.length === 0) return
    setIsUploading(true)
    setProgress(0)

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const text = await extractTextFromPDF(file)
        
        // Convert to structure the API expects
        const extractedContent = JSON.stringify({ extracted_text: text })
        
        await bffApi.uploadBulkResume(selectedJobId, companyId, file, extractedContent, file.name)
        successCount++
      } catch (err) {
        console.error(`Failed to upload ${file.name}`, err)
        failCount++
      }
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setIsUploading(false)
    if (failCount === 0) {
      notifySuccess(`Successfully uploaded and matched ${successCount} candidates!`)
      setFiles([])
      onSuccess?.()
    } else {
      notifyError(`Uploaded ${successCount} candidates, but ${failCount} failed.`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-white">Bulk Resume Upload</h2>
        <p className="text-sm text-white/50">Upload multiple PDF resumes for an active job.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-white/70">Select Job</label>
        <select 
          value={selectedJobId} 
          onChange={e => setSelectedJobId(e.target.value)}
          className="w-full h-12 px-4 bg-[#2b2b2b] border border-white/20 rounded-lg text-white font-bold outline-none focus:border-[#fcc636] transition-colors"
        >
          <option value="" disabled>-- Select a Job to upload resumes --</option>
          {activeJobs.map(job => (
            <option key={job.id} value={job.id}>{job.position_title} ({job.location})</option>
          ))}
        </select>
        {activeJobs.length === 0 && (
          <p className="text-xs text-red-400">You must have an active job to upload resumes.</p>
        )}
      </div>

      {selectedJobId && (
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-brand">
          <div className="space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragOver ? 'border-[#fcc636] bg-[#fcc636]/5' : 'border-white/20 hover:border-white/40 bg-[#2b2b2b]/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#fcc636]/10 flex items-center justify-center text-[#fcc636]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold">Drag & drop PDF resumes here</p>
                  <p className="text-sm text-white/50 mt-1">or click to browse from your computer</p>
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden" 
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="px-6 py-2 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-lg cursor-pointer hover:bg-[#e6b535] transition-colors"
                >
                  Select Files
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">{files.length} Files Selected</h3>
                  <button 
                    onClick={() => setFiles([])}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    disabled={isUploading}
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#2b2b2b] rounded-lg border border-white/5">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#fcc636] shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span className="text-sm truncate text-white">{file.name}</span>
                        <span className="text-xs text-white/40 shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                        disabled={isUploading}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {isUploading && (
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-[#fcc636]">Uploading & Analyzing...</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#2b2b2b] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#fcc636] transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full py-4 bg-[#fcc636] text-[#2b2b2b] font-bold rounded-xl text-lg hover:bg-[#e6b535] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-brand"
                >
                  {isUploading ? 'Processing...' : `Upload & Match ${files.length} Candidates`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
