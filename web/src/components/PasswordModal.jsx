import { useState } from 'react';

export default function PasswordModal({ isOpen, onClose, onSubmit, fileType, clientName }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length > 6) {
      setError('Password must be maximum 6 characters');
      return;
    }
    setError('');
    onSubmit(password);
    setPassword('');
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Password Protect {fileType}</h3>
          <button className="btn-icon btn-ghost" onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Set a password (max 6 characters) for {clientName}'s {fileType} ledger.
            </p>
            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                maxLength={6}
                placeholder="Enter password..."
                required
                autoFocus
                className={error ? 'error-input' : ''}
              />
              {error && <span className="error-text" style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{error}</span>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Download Protected File</button>
          </div>
        </form>
      </div>
    </div>
  );
}
