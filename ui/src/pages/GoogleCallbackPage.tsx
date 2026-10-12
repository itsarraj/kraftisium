import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { parseGoogleCallback } from '../lib/googleAuth';
import { resolvePostLoginPath } from '../lib/postLoginRedirect';
import { getErrorMessage, notifyError } from '../lib/toast';
import { useAuth } from '../contexts/AuthContext';

function clearOAuthQuery(): void {
  const path = window.location.pathname;
  window.history.replaceState(null, '', path);
}

const GoogleCallbackPage = () => {
  const { completeGoogleLogin } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in…');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const finish = async () => {
      const parsed = parseGoogleCallback(window.location);
      if (!parsed || !parsed.success) {
        const text = parsed?.error || 'Invalid Google sign-in response.';
        setMessage(text);
        notifyError(text);
        clearOAuthQuery();
        window.location.replace('/login');
        return;
      }

      // The BFF already set the auth cookies on its redirect to this page —
      // fetch the profile they now grant access to.
      try {
        const user = await completeGoogleLogin();
        clearOAuthQuery();
        window.location.replace(resolvePostLoginPath(user));
      } catch (err) {
        const text = getErrorMessage(err, 'Google sign-in failed');
        setMessage(text);
        notifyError(text);
        clearOAuthQuery();
        window.location.replace('/login');
      }
    };

    void finish();
  }, [completeGoogleLogin]);

  return (
    <>
      <Helmet>
        <title>Google Sign-In - Kraftisium</title>
      </Helmet>
      <div className="min-h-screen bg-[#2b2b2b] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#fcc636] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">{message}</p>
        </div>
      </div>
    </>
  );
};

export default GoogleCallbackPage;
