import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getReports } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDate } from '../utils/format';
import AddReportModal from '../components/AddReportModal';
import toast from 'react-hot-toast';

function SearchIcon() {
  return (
    <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function SkeletonCards() {
  return (
    <div className="reports-grid">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export default function ReportListPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const isBoss = user?.role === 'boss';

  const fetchReports = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await getReports(q);
      setReports(res.data.reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(search);
  }, [search, fetchReports]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <Layout>
      <div className="page-header">
        <h2>{isBoss ? 'All Reports' : 'My Reports'}</h2>
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          {isBoss && (
            <div className="search-bar">
              <SearchIcon />
              <input
                id="report-search"
                type="text"
                placeholder="Search by client or manager name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          )}
          {!isBoss && (
            <button
              id="add-report-btn"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Report
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <SkeletonCards />
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            <p>{search ? `No reports found for "${search}"` : 'No reports yet'}</p>
          </div>
        ) : (
          <div className="reports-grid">
            {reports.map((r) => (
              <Link key={r.id} to={`/dashboard/reports/${r.id}`} className="report-card">
                <div className="report-card-left">
                  <div className="report-card-name">{r.client_name}</div>
                  <div className="report-card-meta">
                    {isBoss && r.manager_name && <span>{r.manager_name} · </span>}
                    {formatDate(r.report_date)}
                  </div>
                </div>
                <div className="report-card-amount">{formatINR(r.amount)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddReportModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchReports(search);
          }}
        />
      )}
    </Layout>
  );
}
