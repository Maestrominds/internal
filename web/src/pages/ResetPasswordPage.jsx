import { useState } from 'react';
import Layout from '../components/Layout';
import { changePassword } from '../api/auth';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Please fill all fields');
    }
    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match');
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>Reset Password</h2>
      </div>

      <div className="page-body" style={{ maxWidth: '500px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="current-password">Current Password</label>
            <input
              id="current-password"
              className="form-input"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              className="form-input"
              type="password"
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              className="form-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="reset-password-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ alignSelf: 'flex-start', marginTop: '10px' }}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </Layout>
  );
}
