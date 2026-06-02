import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getReportById } from '../api/reports';
import { formatINR, formatDate } from '../utils/format';
import ImageGallery from '../components/ImageGallery';
import toast from 'react-hot-toast';

function SkeletonDetail() {
  return (
    <div>
      <div className="detail-card" style={{ overflow: 'hidden' }}>
        <div className="skeleton" style={{ height: '140px', borderRadius: 0 }} />
        <div style={{ padding: '28px 32px' }}>
          <div className="detail-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '8px' }} />
                <div className="skeleton skeleton-text" style={{ width: '80%' }} />
              </div>
            ))}
          </div>
          <div className="skeleton skeleton-text" style={{ width: '40%', margin: '24px 0 16px' }} />
          <div className="image-grid">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-img" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReportById(id)
      .then((res) => setReport(res.data.report))
      .catch(() => {
        toast.error('Failed to load report');
        navigate('/dashboard/reports');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  return (
    <Layout>
      <div className="page-header">
        <div className="flex gap-3" style={{ alignItems: 'center' }}>
          <button className="back-btn" onClick={() => navigate('/dashboard/reports')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h2>Report Details</h2>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <SkeletonDetail />
        ) : report ? (
          <div className="detail-card">
            {/* Card Header */}
            <div className="detail-card-header">
              <div>
                <div className="detail-title">{report.client_name}</div>
                <div className="detail-subtitle">
                  {report.manager_name} · {formatDate(report.report_date)}
                </div>
              </div>
              <div className="detail-amount">{formatINR(report.amount)}</div>
            </div>

            {/* Card Body */}
            <div className="detail-body">
              <div className="detail-grid">
                <div className="detail-field">
                  <label>Client Name</label>
                  <p>{report.client_name}</p>
                </div>
                <div className="detail-field">
                  <label>Amount</label>
                  <p style={{ color: 'var(--accent-500)', fontWeight: 700 }}>{formatINR(report.amount)}</p>
                </div>
                <div className="detail-field">
                  <label>Report Date</label>
                  <p>{formatDate(report.report_date)}</p>
                </div>
                <div className="detail-field">
                  <label>Submitted By</label>
                  <p>{report.manager_name}</p>
                </div>
                {report.note && (
                  <div className="detail-field">
                    <label>Note</label>
                    <p>{report.note}</p>
                  </div>
                )}
                <div className="detail-field">
                  <label>Submitted On</label>
                  <p>{formatDate(report.created_at)}</p>
                </div>
              </div>

              {report.short_desc && (
                <>
                  <div className="detail-section-title">Description</div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px', fontSize: '0.9rem' }}>
                    {report.short_desc}
                  </p>
                </>
              )}

              {report.images && report.images.length > 0 && (
                <>
                  <div className="detail-section-title">
                    Attachments ({report.images.length})
                  </div>
                  <ImageGallery images={report.images} />
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
