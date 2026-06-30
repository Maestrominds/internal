export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel, loading = false }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 style={{ color: danger ? 'var(--danger)' : undefined }}>{title}</h3>
          <button className="btn-icon btn-ghost" onClick={onCancel} disabled={loading} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button id="confirm-cancel-btn" className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            id="confirm-action-btn"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
