import { Link } from 'react-router-dom';

type Props = {
  passwordForm: any;
  setPasswordForm: (f: any) => void;
  passwordError: string;
  passwordSuccess: string;
  passwordLoading: boolean;
  onChangePassword: (e: React.FormEvent) => void;
  deleteConfirm: string;
  setDeleteConfirm: (v: string) => void;
  deleteError: string;
  deleteLoading: boolean;
  onDeleteAccount: () => void;
};

export default function CandidateSettingsTab({
  passwordForm,
  setPasswordForm,
  passwordError,
  passwordSuccess,
  passwordLoading,
  onChangePassword,
  deleteConfirm,
  setDeleteConfirm,
  deleteError,
  deleteLoading,
  onDeleteAccount,
}: Props) {
  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      <div className="p-8 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-brand space-y-8">
        <h3 className="text-lg font-bold text-white">Change password</h3>
        {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
        {passwordSuccess && <p className="text-green-400 text-sm">{passwordSuccess}</p>}
        <form className="space-y-6" onSubmit={onChangePassword}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white">Current password</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none shadow-brand"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">New password</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, newPassword: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none shadow-brand"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white">Confirm new password</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((f: any) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none shadow-brand"
                required
                minLength={8}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="k-btn w-full sm:w-auto"
          >
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>

      <div className="p-8 rounded-xl bg-[#1a1a1a] border border-red-500/30 shadow-brand space-y-6">
        <h3 className="text-lg font-bold text-white">Delete account</h3>
        <p className="text-sm text-white/60">
          This signs you out immediately. You will not be able to log in to this account again.
          You can register later with the same email as a new account.{' '}
          <Link to="/delete-account" className="text-[#fcc636] hover:underline">
            What happens to your data
          </Link>
          .
        </p>
        {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
        <div className="space-y-2">
          <label className="text-sm text-white">Type DELETE to confirm</label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full h-11 px-4 rounded-lg bg-[#2b2b2b] border border-white/10 text-white outline-none shadow-brand"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          disabled={deleteLoading || deleteConfirm !== 'DELETE'}
          onClick={onDeleteAccount}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-600 text-white font-bold shadow-brand hover:bg-red-500 transition-all disabled:opacity-50"
        >
          {deleteLoading ? 'Deleting...' : 'Delete my account'}
        </button>
      </div>
    </div>
  );
}
