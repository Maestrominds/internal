import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getManagers, deleteManager, resetManagerPassword } from '../api/managers';
import { formatDate, getInitials } from '../utils/format';
import AddManagerModal from '../components/AddManagerModal';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';

function SkeletonTable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: '52px', borderRadius: '8px' }} />
      ))}
    </div>
  );
}

export default function ManagerListPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // manager obj
  const [resetting, setResetting] = useState(null); // manager id

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await getManagers();
      setManagers(res.data.managers);
    } catch {
      toast.error('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchManagers(); }, []);

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteManager(confirmDelete.id);
      toast.success(`${confirmDelete.name} has been removed`);
      setConfirmDelete(null);
      fetchManagers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  async function handleResetPassword(manager) {
    const password = prompt(`Enter new password for ${manager.name} (min 6 characters):`);
    if (password === null) return; // Cancelled by user
    if (password.trim().length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setResetting(manager.id);
    try {
      await resetManagerPassword(manager.id, password.trim());
      toast.success(`Password for ${manager.name} reset successfully!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setResetting(null);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>Managers</h2>
        <button
          id="add-manager-btn"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Manager
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <SkeletonTable />
        ) : managers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>No managers yet. Add one to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="manager-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Added On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex gap-2" style={{ alignItems: 'center' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {getInitials(m.name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{m.email}</td>
                    <td>
                      <span className={`badge ${m.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {m.is_active ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(m.created_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          id={`reset-pwd-${m.id}`}
                          className="btn btn-outline btn-sm"
                          onClick={() => handleResetPassword(m)}
                          disabled={resetting === m.id}
                          title="Reset Password"
                        >
                          {resetting === m.id ? '...' : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                              </svg>
                              Reset
                            </>
                          )}
                        </button>
                        <button
                          id={`delete-mgr-${m.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmDelete(m)}
                          title="Delete Manager"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddManagerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchManagers();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Manager"
          message={`Are you sure you want to delete "${confirmDelete.name}"? They will be immediately logged out if currently signed in.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

    </Layout>
  );
}
