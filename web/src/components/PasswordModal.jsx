import { useState, useEffect } from 'react';

export default function PasswordModal({ isOpen, onClose, onSubmit, fileType, clientName }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('select');

  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setPassword('');
      setError('');
    }
  }, [isOpen]);

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
  };

  const handleClose = () => {
    onClose();
  };

  const handleWithoutPassword = () => {
    onSubmit(null);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Download {fileType}</h3>
          <button className="btn-icon btn-ghost" onClick={handleClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        {mode === 'select' ? (
          <div className="modal-body" style={{ paddingBottom: '2rem' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              How would you like to download {clientName}'s {fileType} ledger?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '1rem' }}
                onClick={handleWithoutPassword}
              >
                🔓 Download Without Password
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', fontSize: '1rem' }}
                onClick={() => setMode('password')}
              >
                🔒 Password Protect File
              </button>
            </div>
          </div>
        ) : (
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
              <button type="button" className="btn btn-ghost" onClick={() => setMode('select')}>Back</button>
              <button type="submit" className="btn btn-primary">Download Protected File</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
