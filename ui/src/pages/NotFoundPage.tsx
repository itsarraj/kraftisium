import { Helmet } from 'react-helmet'
import { Link } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found - Kraftisium</title>
        <meta name="description" content="The page you're looking for doesn't exist. Return to Kraftisium homepage." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="hero min-h-screen bg-[#2b2b2b] text-white">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-9xl font-bold text-[#fcc636] drop-shadow-brand">404</h1>
            <h2 className="text-4xl font-bold mb-4 mt-8">Page Not Found</h2>
            <p className="py-6 text-white/70">
              Sorry, the page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
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

export default NotFoundPage