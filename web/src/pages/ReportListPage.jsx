import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getReports, getClients } from '../api/reports';
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
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const isBoss = user?.role === 'boss';

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getClients();
      setClients(res.data.clients);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportsForClient = useCallback(async (client) => {
    setLoading(true);
    try {
      const params = {};
      if (client.client_phone) {
        params.client_phone = client.client_phone;
      } else {
        params.client_name = client.client_name;
      }
      const res = await getReports(params);
      setReports(res.data.reports);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClient) {
      fetchClients();
    } else {
      fetchReportsForClient(selectedClient);
    }
  }, [selectedClient, fetchClients, fetchReportsForClient]);

  const handleClientClick = (client) => {
    setSearchInput('');
    setSelectedClient(client);
  };

  const handleBackToClients = () => {
    setSearchInput('');
    setSelectedClient(null);
  };

  // Filter clients list locally
  const filteredClients = clients.filter((c) =>
    c.client_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    (c.client_phone && c.client_phone.includes(searchInput))
  );

  // Filter reports list locally (useful if searching within client view)
  const filteredReports = reports.filter((r) =>
    r.client_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    (r.manager_name && r.manager_name.toLowerCase().includes(searchInput.toLowerCase())) ||
    (r.note && r.note.toLowerCase().includes(searchInput.toLowerCase()))
  );

  return (
    <Layout>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          {selectedClient && (
            <button className="back-btn" onClick={handleBackToClients} style={{ marginRight: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
          )}
          <h2>
            {selectedClient
              ? `Reports: ${selectedClient.client_name}`
              : isBoss
              ? 'Clients (All)'
              : 'Clients (My View)'}
          </h2>
        </div>

        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <div className="search-bar">
            <SearchIcon />
            <input
              id="report-search"
              type="text"
              placeholder={
                selectedClient
                  ? 'Search within this client...'
                  : 'Search by client name or phone...'
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
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
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <SkeletonCards />
        ) : !selectedClient ? (
          /* Client List Mode */
          filteredClients.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p>{searchInput ? `No clients match "${searchInput}"` : 'No clients found'}</p>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredClients.map((c, idx) => (
                <div
                  key={idx}
                  className="report-card"
                  onClick={() => handleClientClick(c)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="report-card-left">
                    <div className="report-card-name">{c.client_name}</div>
                    {c.client_phone && (
                      <div className="report-card-meta" style={{ marginTop: '4px' }}>
                        📞 {c.client_phone}
                      </div>
                    )}
                  </div>
                  <div className="report-card-amount" style={{ fontSize: '0.85rem', color: 'var(--accent-500)', fontWeight: 'bold' }}>
                    View Reports →
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Reports of Selected Client Mode */
          filteredReports.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <p>No reports found</p>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((r) => (
                <Link key={r.id} to={`/dashboard/reports/${r.id}`} className="report-card">
                  <div className="report-card-left">
                    <div className="report-card-name">
                      {r.client_name}
                      {r.client_phone && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>({r.client_phone})</span>}
                    </div>
                    <div className="report-card-meta">
                      {r.manager_name && <span>By {r.manager_name} · </span>}
                      {formatDate(r.report_date)}
                    </div>
                  </div>
                  <div className="report-card-amount">{formatINR(r.amount)}</div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>

      {showAddModal && (
        <AddReportModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            if (selectedClient) {
              fetchReportsForClient(selectedClient);
            } else {
              fetchClients();
            }
          }}
        />
      )}
    </Layout>
  );
}
