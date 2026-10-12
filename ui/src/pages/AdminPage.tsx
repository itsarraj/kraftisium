import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { bffApi, AdminOverview, AdminUserRow } from '../services/bffApi'
import { getErrorMessage, notifyError } from '../lib/toast'

const StatTile = ({ label, value }: { label: string; value: number }) => (
  <div className="p-4 rounded-xl bg-[#1a1a1a] border border-white/10">
    <p className="text-2xl font-bold text-white">{value.toLocaleString('en-IN')}</p>
    <p className="text-xs text-white/50 uppercase tracking-wide mt-1">{label}</p>
  </div>
)

const AdminPage = () => {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [ov, us] = await Promise.all([bffApi.getAdminOverview(), bffApi.getAdminUsers()])
        setOverview(ov)
        setUsers(us)
      } catch (error) {
        notifyError(getErrorMessage(error, 'Failed to load admin overview.'), { id: 'admin-load' })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <Helmet>
        <title>Admin - Kraftisium</title>
      </Helmet>

      <div className="min-h-screen bg-[#2b2b2b] text-white py-12 px-4 md:px-16">
        <div className="container mx-auto max-w-5xl space-y-10">
          <div>
            <h1 className="text-4xl font-bold text-white">Admin overview</h1>
            <p className="text-white/50">Whether anyone is actually using the app — not a full analytics suite.</p>
          </div>

          {isLoading ? (
            <p className="text-white/50">Loading…</p>
          ) : overview ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatTile label="Total users" value={overview.total_users} />
                <StatTile label="Signups (7d)" value={overview.signups_7d} />
                <StatTile label="Candidates" value={overview.total_candidates} />
                <StatTile label="Recruiters" value={overview.total_recruiters} />
                <StatTile label="Resumes uploaded" value={overview.resumes_uploaded} />
                <StatTile label="Active jobs" value={overview.active_jobs} />
                <StatTile label="Applications total" value={overview.applications_total} />
                <StatTile label="Applications (7d)" value={overview.applications_7d} />
                <StatTile label="Premium subscribers" value={overview.premium_subscribers} />
                <StatTile label="Premium conversions (7d)" value={overview.premium_conversions_7d} />
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-bold text-white">Recent users</h2>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#1a1a1a] text-white/50 text-left">
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Verified</th>
                        <th className="px-4 py-3 font-medium">Premium</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-t border-white/5">
                          <td className="px-4 py-3 text-white">{u.name || '—'}</td>
                          <td className="px-4 py-3 text-white/70">{u.email}</td>
                          <td className="px-4 py-3 text-white/70 capitalize">{u.role}</td>
                          <td className="px-4 py-3">{u.email_verified ? '✅' : '—'}</td>
                          <td className="px-4 py-3">{u.is_premium_candidate ? '✅' : '—'}</td>
                          <td className="px-4 py-3 text-white/50">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-white/50">Failed to load.</p>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminPage
