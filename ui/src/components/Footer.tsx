import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, BRAND_MARK_ASPECT, BRAND_MARK_PATH } from '../constants/brand';

const linkClass = 'link link-hover hover:text-[#fcc636] transition-colors';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1a1a1a] text-white border-t border-white/10">
      <div className="footer p-10 container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        <div>
          <Link to="/" className="flex items-center gap-3 mb-4 group">
            <img src={BRAND_MARK_PATH} alt="" height={32} width={Math.round(32 * BRAND_MARK_ASPECT)} className="shrink-0 object-contain" />
            <div>
              <p className="text-xl font-bold text-white group-hover:text-[#fcc636] transition-colors">
                {APP_NAME}
              </p>
              <p className="text-sm text-white/50">{APP_TAGLINE}</p>
            </div>
          </Link>
          <p className="text-sm text-white/60 leading-relaxed">
            AI-powered job search and resume matching for candidates and employers.
          </p>
          <Link
            to="/download"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition-colors hover:border-[#fcc636]/40 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#fcc636]">
              <path d="M3 3.5L14.5 12L3 20.5V3.5Z" fill="currentColor" />
              <path d="M14.5 12L18 9.8L20.5 11.3C21.2 11.7 21.2 12.3 20.5 12.7L18 14.2L14.5 12Z" fill="currentColor" fillOpacity="0.7" />
            </svg>
            Get the app
          </Link>
        </div>

        <div>
          <span className="footer-title text-[#fcc636]">Company</span>
          <Link to="/about" className={linkClass}>
            About us
          </Link>
          <Link to="/contact" className={linkClass}>
            Contact
          </Link>
          <Link to="/jobs" className={linkClass}>
            Jobs
          </Link>
          <Link to="/employers" className={linkClass}>
            For employers
          </Link>
          <Link to="/press-kit" className={linkClass}>
            Press kit
          </Link>
        </div>

        <div>
          <span className="footer-title text-[#fcc636]">Legal</span>
          <Link to="/terms" className={linkClass}>
            Terms & Conditions
          </Link>
          <Link to="/privacy" className={linkClass}>
            Privacy policy
          </Link>
          <Link to="/cookies" className={linkClass}>
            Cookie policy
          </Link>
          <Link to="/delete-account" className={linkClass}>
            Delete account
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 px-4 text-center text-sm text-white/50">
        © {year} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
