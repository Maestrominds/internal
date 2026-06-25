import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { getAuditLogs } from '../api/audit';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ACTION_COLORS = {
  LOGIN: { bg: '#dbeafe', color: '#1d4ed8', label: 'Login' },
  CREATE_REPORT: { bg: '#dcfce7', color: '#15803d', label: 'Create Report' },
  EDIT_REPORT: { bg: '#fef3c7', color: '#b45309', label: 'Edit Report' },
  ADD_MANAGER: { bg: '#e0e7ff', color: '#4338ca', label: 'Add Manager' },
  DEACTIVATE_MANAGER: { bg: '#fee2e2', color: '#dc2626', label: 'Deactivate Manager' },
  RESET_PASSWORD: { bg: '#fce7f3', color: '#9d174d', label: 'Reset Password' },
};

const ACTION_OPTIONS = ['All', 'LOGIN', 'CREATE_REPORT', 'EDIT_REPORT', 'ADD_MANAGER', 'DEACTIVATE_MANAGER', 'RESET_PASSWORD'];

function ActionBadge({ action }) {
  const cfg = ACTION_COLORS[action] || { bg: '#f1f5f9', color: '#475569', label: action };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '99px',
      fontSize: '0.75rem',
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const isBoss = role === 'boss';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '0.72rem',
      fontWeight: 600,
      background: isBoss ? '#fef3c7' : '#e0e7ff',
      color: isBoss ? '#92400e' : '#3730a3',
    }}>
      {role}
    </span>
  );
}

function formatDateTime(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      <td colSpan={5} style={{ padding: '12px 16px' }}>
        <div className="skeleton" style={{ height: '18px', borderRadius: '6px', width: `${60 + (i % 3) * 15}%` }} />
      </td>
    </tr>
  ));
}

const LIMIT = 20;

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('All');

  const fetchLogs = useCallback(async (p = 1, action = 'All') => {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (action !== 'All') params.action = action;
      const res = await getAuditLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, actionFilter);
  }, [page, actionFilter, fetchLogs]);

  const handleFilterChange = (action) => {
    setActionFilter(action);
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Audit Logs
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Complete activity history — who did what and when
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => fetchLogs(page, actionFilter)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {ACTION_OPTIONS.map(opt => {
            const cfg = opt === 'All' ? { bg: '#1e4d8c', color: '#fff' } : ACTION_COLORS[opt];
            const isActive = actionFilter === opt;
            return (
              <button
                key={opt}
                onClick={() => handleFilterChange(opt)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '99px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: isActive ? 'none' : '1.5px solid var(--border-color)',
                  background: isActive ? (cfg?.bg || '#1e4d8c') : 'transparent',
                  color: isActive ? (opt === 'All' ? '#fff' : cfg?.color) : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt === 'All' ? 'All Actions' : (ACTION_COLORS[opt]?.label || opt)}
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #1e4d8c)',
          borderRadius: '10px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#fff',
          fontSize: '0.88rem',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            Showing <strong>{logs.length}</strong> of <strong>{total}</strong> total log entries
            {actionFilter !== 'All' && <> — filtered by <strong>{ACTION_COLORS[actionFilter]?.label || actionFilter}</strong></>}
          </span>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', background: 'var(--card-bg, #fff)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color, #e5e7eb)', background: 'var(--table-header-bg, #f9fafb)' }}>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date & Time</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>User</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Action</th>
                <th style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state" style={{ padding: '48px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <p>No audit log entries found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: '1px solid var(--border-color, #f3f4f6)',
                      background: idx % 2 === 0 ? 'transparent' : 'var(--hover-bg, #fafafa)',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--hover-bg, #f0f4ff)'}
                    onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--hover-bg, #fafafa)'}
                  >
                    <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.user_name || '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <RoleBadge role={log.user_role} />
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                      {log.description || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <button
              className="btn btn-outline"
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-outline"
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
