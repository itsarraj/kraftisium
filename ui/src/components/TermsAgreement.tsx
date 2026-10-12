import { Link } from 'react-router-dom';
import { PRIVACY_PATH, TERMS_CANDIDATE_PATH, TERMS_EMPLOYER_PATH } from '../constants/terms';

type Props = {
  role: 'candidate' | 'employer';
  className?: string;
};

export default function TermsAgreement({ role, className = '' }: Props) {
  const termsPath = role === 'candidate' ? TERMS_CANDIDATE_PATH : TERMS_EMPLOYER_PATH;
  const roleLabel = role === 'candidate' ? 'candidate' : 'employer';

  return (
    <p className={`text-sm text-white/60 text-center ${className}`}>
      By continuing as a {roleLabel}, you agree to our{' '}
      <Link to={termsPath} className="text-[#fcc636] hover:underline">
        T&amp;C
      </Link>{' '}
      and{' '}
      <Link to={PRIVACY_PATH} className="text-[#fcc636] hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}
