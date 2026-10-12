import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'

const UnauthorizedPage = () => {
  return (
    <>
      <Helmet>
        <title>Unauthorized - Kraftisium</title>
        <meta name="description" content="You don't have permission to access this page." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="hero min-h-screen bg-[#2b2b2b] text-white">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-9xl font-bold text-[#fcc636] drop-shadow-brand">403</h1>
            <h2 className="text-4xl font-bold mb-4 mt-8">Unauthorized</h2>
            <p className="py-6 text-white/70">
              You don't have permission to access this page. Please contact support if you believe this is an error.
            </p>
            <Link to="/" className="k-btn">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default UnauthorizedPage
