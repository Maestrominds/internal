import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getReports, getClients, getReportById, exportClientExcel, downloadLedgerPdf } from '../api/reports';
import { useAuth } from '../context/AuthContext';
import { formatINR, formatDate } from '../utils/format';
import AddReportModal from '../components/AddReportModal';
import EditReportModal from '../components/EditReportModal';
import { Lightbox } from '../components/ImageGallery';
import toast from 'react-hot-toast';

function SearchIcon() {
  return (
    <svg className="search-bar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [page, setPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const LIMIT = 10;

  const clientNameParam = searchParams.get('client_name');
  const clientPhoneParam = searchParams.get('client_phone');

  const selectedClient = useMemo(() => {
    if (!clientNameParam) return null;
    const match = clients.find(
      (c) => c.client_name === clientNameParam && (c.client_phone || '') === (clientPhoneParam || '')
    );
    return match || { client_name: clientNameParam, client_phone: clientPhoneParam };
  }, [clientNameParam, clientPhoneParam, clients]);

  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReportForAction, setSelectedReportForAction] = useState(null);
  const [lightboxImages, setLightboxImages] = useState(null);
  const [reportToEdit, setReportToEdit] = useState(null);
  const [loadingReportDetails, setLoadingReportDetails] = useState(false);

  const isBoss = user?.role === 'boss';

  // ── Download helpers ──
  const handleExportExcel = async (client, e) => {
    if (e) e.stopPropagation();
    const toastId = toast.loading('Preparing Excel...');
    try {
      const params = { client_name: client.client_name };
      if (client.client_phone) params.client_phone = client.client_phone;
      const res = await exportClientExcel(params);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.client_name.replace(/\s+/g, '_')}_ledger.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Excel downloaded!', { id: toastId });
    } catch {
      toast.error('Failed to download Excel', { id: toastId });
    }
  };

  const handleDownloadPdf = async (client, e) => {
    if (e) e.stopPropagation();
    const toastId = toast.loading('Generating PDF...');
    try {
      const params = { client_name: client.client_name };
      if (client.client_phone) params.client_phone = client.client_phone;
      const res = await downloadLedgerPdf(params);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.client_name.replace(/\s+/g, '_')}_ledger.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded!', { id: toastId });
    } catch {
      toast.error('Failed to download PDF', { id: toastId });
    }
  };

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

  const fetchReportsForClient = useCallback(async (client, currentPage = 1) => {
    setLoading(true);
    try {
      const params = {
        client_name: client.client_name,
        page: currentPage,
        limit: LIMIT
      };
      if (client.client_phone) {
        params.client_phone = client.client_phone;
      }
      const res = await getReports(params);
      setReports(res.data.reports);
      setTotalReports(res.data.totalCount || 0);
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
      fetchReportsForClient(selectedClient, page);
    }
  }, [selectedClient, page, fetchClients, fetchReportsForClient]);

  const handleViewImages = async (reportId, e) => {
    e.stopPropagation();
    setLoadingReportDetails(true);
    try {
      const res = await getReportById(reportId);
      const images = res.data.report.images;
      if (images && images.length > 0) {
        setLightboxImages(images);
      } else {
        toast.error('No images found for this transaction');
      }
    } catch {
      toast.error('Failed to load images');
    } finally {
      setLoadingReportDetails(false);
    }
  };

  const handleEditClick = async (reportId) => {
    setSelectedReportForAction(null);
    setLoadingReportDetails(true);
    try {
      const res = await getReportById(reportId);
      setReportToEdit(res.data.report);
    } catch {
      toast.error('Failed to load report details');
    } finally {
      setLoadingReportDetails(false);
    }
  };

  const handleClientClick = (client) => {
    setSearchInput('');
    setPage(1);
    setSearchParams({
      client_name: client.client_name,
      client_phone: client.client_phone || ''
    });
  };

  const handleBackToClients = () => {
    setSearchInput('');
    setPage(1);
    setSearchParams({});
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

  const firstReport = useMemo(() => {
    if (reports.length === 0) return null;
    const sorted = [...reports].sort((a, b) => {
      const dateDiff = new Date(a.report_date) - new Date(b.report_date);
      if (dateDiff !== 0) return dateDiff;
      // Since reports is ordered newest first, the older report is later in the reports array (has a larger index).
      return reports.indexOf(b) - reports.indexOf(a);
    });
    return sorted[0];
  }, [reports]);

  const firstReportAmount = firstReport ? parseFloat(firstReport.amount) || 0 : 0;
  const firstReportIsGreen = firstReport ? firstReport.is_green : true;
  const formattedFirstReport = firstReport ? `${firstReportIsGreen ? '+' : '-'}${formatINR(firstReportAmount)}` : '—';

  const netOutstanding = useMemo(() => {
    return reports.reduce((sum, r) => r.is_green ? sum + (parseFloat(r.amount) || 0) : sum - (parseFloat(r.amount) || 0), 0);
  }, [reports]);

  const netOutstandingIsGreen = netOutstanding >= 0;
  const formattedNetOutstanding = `${netOutstandingIsGreen ? '+' : '-'}${formatINR(Math.abs(netOutstanding))}`;

  const latestReport = useMemo(() => {
    if (reports.length === 0) return null;
    const sorted = [...reports].sort((a, b) => new Date(b.report_date) - new Date(a.report_date));
    return sorted[0];
  }, [reports]);

  const latestReportDate = latestReport ? formatDate(latestReport.report_date) : '—';

  const reportsWithCumulativeOutstanding = useMemo(() => {
    const reversed = [...filteredReports].reverse();
    let runningSum = 0;
    const runningSumsMap = {};
    for (const r of reversed) {
      const amt = parseFloat(r.amount) || 0;
      runningSum = r.is_green ? runningSum + amt : runningSum - amt;
      runningSumsMap[r.id] = runningSum;
    }
    return filteredReports.map(r => ({
      ...r,
      cumulativeOutstanding: runningSumsMap[r.id] || 0
    }));
  }, [filteredReports]);

  return (
    <Layout>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          {selectedClient && (
            <button className="back-btn" onClick={handleBackToClients} style={{ marginRight: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
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
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {selectedClient ? 'Add Report' : 'Add Client'}
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
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
                    {c.client_business_name && (
                      <div className="report-card-meta" style={{ marginTop: '2px', fontWeight: 500, color: 'var(--accent-500)' }}>
                        {c.client_business_name}
                      </div>
                    )}
                    {c.client_phone && (
                      <div className="report-card-meta" style={{ marginTop: '4px' }}>
                        📞 {c.client_phone}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div className="report-card-amount" style={{ fontSize: '0.85rem', color: 'var(--accent-500)', fontWeight: 'bold' }}>
                      View Reports →
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      <button
                        title="Download Excel"
                        onClick={(e) => handleExportExcel(c, e)}
                        style={{
                          padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600,
                          background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0',
                          borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        📥 Excel
                      </button>
                      <button
                        title="Download PDF Ledger"
                        onClick={(e) => handleDownloadPdf(c, e)}
                        style={{
                          padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600,
                          background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                          borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        📄 PDF
                      </button>
                    </div>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
              <p>No reports found</p>
            </div>
          ) : (
            <div>
              {/* Premium Blue Header UI */}
              <div style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>{selectedClient.client_name}</h3>
                      {selectedClient.client_business_name && (
                        <span style={{ fontSize: '1.2rem', opacity: 0.9, fontWeight: 500 }}>
                          {selectedClient.client_business_name}
                        </span>
                      )}
                    </div>
                    {selectedClient.client_phone && (
                      <p style={{ margin: '8px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>📞 {selectedClient.client_phone}</p>
                    )}
                  </div>
                  {/* Download Buttons in blue header */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={(e) => handleExportExcel(selectedClient, e)}
                      style={{
                        padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
                        background: 'rgba(255,255,255,0.15)', color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      📥 Excel
                    </button>
                    <button
                      onClick={(e) => handleDownloadPdf(selectedClient, e)}
                      style={{
                        padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600,
                        background: 'rgba(255,255,255,0.15)', color: '#fff',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      📄 PDF
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  {/* Received Amt and Started Date aligned in the same line */}
                  <div style={{ display: 'flex', gap: '60px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AMT RECEIVED</span>
                      <h4 style={{
                        margin: 0,
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: firstReportIsGreen ? '#10b981' : '#f87171'
                      }}>
                        {formattedFirstReport}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Started Date</span>
                      <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                        {firstReport ? formatDate(firstReport.report_date) : '—'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Net Outstanding and Last Report date aligned in the same line */}
                  <div style={{ display: 'flex', gap: '60px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Outstanding</span>
                      <h4 style={{
                        margin: 0,
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: netOutstandingIsGreen ? '#10b981' : '#f87171'
                      }}>
                        {formattedNetOutstanding}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Report</span>
                      <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                        {latestReportDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger Table */}
              <div style={{ overflowX: 'auto', backgroundColor: 'var(--card-bg, #ffffff)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color, #e5e7eb)', backgroundColor: 'var(--table-header-bg, #f9fafb)' }}>
                      <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Created / Edited By</th>
                      <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Uploaded Date</th>
                      <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount</th>
                      <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Net Outstanding</th>
                      <th style={{ padding: '16px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsWithCumulativeOutstanding.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedReportForAction(r)}
                        style={{
                          borderBottom: '1px solid var(--border-color, #f3f4f6)',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg, #f9fafb)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px', fontSize: '0.9rem', fontWeight: 500 }}>{r.manager_name}</td>
                        <td style={{ padding: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{formatDate(r.report_date)}</td>
                        <td style={{
                          padding: '16px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: r.is_green ? '#10b981' : '#ef4444'
                        }}>
                          {r.is_green ? '+' : '-'} {formatINR(r.amount)}
                        </td>
                        <td style={{
                          padding: '16px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: r.cumulativeOutstanding >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {r.cumulativeOutstanding >= 0 ? '+' : '-'} {formatINR(Math.abs(r.cumulativeOutstanding))}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          {r.image_count > 0 ? (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={(e) => handleViewImages(r.id, e)}
                              style={{
                                padding: '6px 12px',
                                borderColor: 'var(--accent-500)',
                                color: 'var(--accent-500)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                background: 'transparent'
                              }}
                            >
                              🖼️ View ({r.image_count})
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No images</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination Controls */}
              {totalReports > LIMIT && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {Math.ceil(totalReports / LIMIT)}
                  </span>
                  <button
                    className="btn btn-outline"
                    onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalReports / LIMIT)))}
                    disabled={page >= Math.ceil(totalReports / LIMIT)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {showAddModal && (
        <AddReportModal
          prefilledClientName={selectedClient?.client_name}
          prefilledClientPhone={selectedClient?.client_phone}
          prefilledClientBusinessName={selectedClient?.client_business_name}
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

      {selectedReportForAction && (
        <div className="modal-overlay" onClick={() => setSelectedReportForAction(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Action</h3>
              <button className="btn-icon btn-ghost" onClick={() => setSelectedReportForAction(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>What would you like to do for this transaction?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link
                  to={`/dashboard/reports/${selectedReportForAction.id}`}
                  state={{ client: selectedClient }}
                  className="btn btn-primary"
                  style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
                  onClick={() => setSelectedReportForAction(null)}
                >
                  🔍 View Full Details
                </Link>
                <button
                  className="btn btn-outline"
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={() => handleEditClick(selectedReportForAction.id)}
                >
                  ✏️ Edit Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportToEdit && (
        <EditReportModal
          report={reportToEdit}
          onClose={() => setReportToEdit(null)}
          onSuccess={() => {
            setReportToEdit(null);
            if (selectedClient) {
              fetchReportsForClient(selectedClient);
            } else {
              fetchClients();
            }
          }}
        />
      )}

      {lightboxImages && (
        <Lightbox
          images={lightboxImages}
          startIndex={0}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {loadingReportDetails && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          color: '#fff',
          fontSize: '1.2rem',
          fontWeight: 'bold'
        }}>
          Loading details...
        </div>
      )}
    </Layout>
  );
}
