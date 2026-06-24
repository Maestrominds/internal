import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ResetPasswordModal({ manager, onClose, onConfirm }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) return toast.error('Please enter a password');
    if (password.trim().length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await onConfirm(password.trim());
      onClose();
    } catch {
      // error is handled by parent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Reset Password</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Enter new password for <strong>{manager.name}</strong> (minimum 6 characters):
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-mgr-password">New Password</label>
              <input
                id="reset-mgr-password"
                className="form-input"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              id="reset-password-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
