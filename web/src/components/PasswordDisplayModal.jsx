import { useState } from 'react';
import toast from 'react-hot-toast';

export default function PasswordDisplayModal({ name, password, onClose }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password copied!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Copy failed — please copy manually');
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Password Generated</h3>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            A new password has been generated for <strong>{name}</strong>.
            Copy it now — it won't be shown again.
          </p>

          <div className="password-box">
            <span className="password-text">{password}</span>
            <button
              id="copy-password-btn"
              className="btn btn-outline btn-sm"
              onClick={handleCopy}
              style={{ flexShrink: 0 }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ⚠️ Share this password securely with the manager. They should change it after first login if needed.
          </p>
        </div>

        <div className="modal-footer">
          <button id="close-password-modal" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
