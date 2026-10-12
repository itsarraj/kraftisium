import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'

const AccountDeletedPage = () => {
  return (
    <>
      <Helmet>
        <title>Account deleted - Kraftisium</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-[70vh] bg-[#2b2b2b] text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-3xl font-bold text-[#fcc636]">Account deleted</h1>
          <p className="text-white/70 text-lg">
            Thank you. Your account has been deleted.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 rounded-xl bg-[#fcc636] text-[#2b2b2b] font-bold hover:bg-[#e6b535] shadow-brand"
          >
            Back to login
          </Link>
        </div>
      </div>
    </>
  )
}

export default AccountDeletedPage
