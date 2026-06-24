import { useState } from 'react';
import { addManager } from '../api/managers';
import toast from 'react-hot-toast';

const MAX_NAME = 50;
const MAX_EMAIL = 50;

export default function AddManagerModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return toast.error('Please fill all fields');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await addManager(name.trim(), email.trim(), password);
      toast.success('Manager added successfully!');
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add manager');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add Manager</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="mgr-name">Full Name</label>
              <input
                id="mgr-name"
                className="form-input"
                type="text"
                placeholder="Enter manager's name"
                value={name}
                maxLength={MAX_NAME}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className={`char-count ${name.length >= MAX_NAME ? 'at-limit' : name.length >= 40 ? 'near-limit' : ''}`}>
                {name.length}/{MAX_NAME}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mgr-email">Email Address</label>
              <input
                id="mgr-email"
                className="form-input"
                type="email"
                placeholder="manager@company.com"
                value={email}
                maxLength={MAX_EMAIL}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className={`char-count ${email.length >= MAX_EMAIL ? 'at-limit' : ''}`}>
                {email.length}/{MAX_EMAIL}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mgr-password">Password</label>
              <input
                id="mgr-password"
                className="form-input"
                type="password"
                placeholder="Choose a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              id="add-manager-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
