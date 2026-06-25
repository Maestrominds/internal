import { useState } from 'react';
import { createReport } from '../api/reports';
import toast from 'react-hot-toast';
import { compressImage } from '../utils/compress';

const MAX_CLIENT = 50;
const MAX_NOTE = 20;
const MAX_DESC = 200;
const MAX_IMAGES = 5;

function today() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
}

export default function AddReportModal({ prefilledClientName, prefilledClientPhone, prefilledClientBusinessName, onClose, onSuccess }) {
  const [clientName, setClientName] = useState(prefilledClientName || '');
  const [clientPhone, setClientPhone] = useState(prefilledClientPhone || '');
  const [clientBusinessName, setClientBusinessName] = useState(prefilledClientBusinessName || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [captions, setCaptions] = useState([]);
  const [shortDesc, setShortDesc] = useState('');
  const [date, setDate] = useState(today());
  const [nextReportDate, setNextReportDate] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isGreen, setIsGreen] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleImages(e) {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.error(`Max ${MAX_IMAGES} images allowed`);
    }

    setLoading(true);
    try {
      const compressedFiles = await Promise.all(toAdd.map(file => compressImage(file)));
      setImages((prev) => [...prev, ...compressedFiles]);
      setCaptions((prev) => [...prev, ...compressedFiles.map(() => '')]);
      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => setPreviews((prev) => [...prev, ev.target.result]);
        reader.readAsDataURL(file);
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to compress images');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
    setCaptions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (amount && parseFloat(amount) < 0) {
      return toast.error('Amount must be greater than or equal to 0');
    }

    // Validate captions
    for (let i = 0; i < images.length; i++) {
      const cap = captions[i];
      if (!cap || !cap.trim()) {
        return toast.error(`Please provide a caption for image #${i + 1}`);
      }
      if (cap.length > 200) {
        return toast.error(`Caption for image #${i + 1} must be 200 characters or less`);
      }
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('client_name', clientName.trim());
    formData.append('client_phone', clientPhone.trim());
    formData.append('client_business_name', clientBusinessName.trim());
    formData.append('amount', amount);
    formData.append('note', note.trim());
    formData.append('short_desc', shortDesc.trim());
    formData.append('report_date', date);
    formData.append('is_green', isGreen);
    formData.append('next_report_date', nextReportDate);
    images.forEach((img) => formData.append('images', img));
    captions.forEach((cap) => formData.append('captions', cap.trim()));

    try {
      await createReport(formData);
      toast.success('Report submitted successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Add Report</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Client Name */}
            {!prefilledClientName && (
              <div className="form-group">
                <label className="form-label" htmlFor="report-client">Client Name</label>
                <input
                  id="report-client"
                  className="form-input"
                  type="text"
                  placeholder="Enter client name (optional)"
                  value={clientName}
                  maxLength={MAX_CLIENT}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <div className={`char-count ${clientName.length >= MAX_CLIENT ? 'at-limit' : clientName.length >= 40 ? 'near-limit' : ''}`}>
                  {clientName.length}/{MAX_CLIENT}
                </div>
              </div>
            )}

            {/* Client Phone */}
            {!prefilledClientName && (
              <div className="form-group">
                <label className="form-label" htmlFor="report-phone">Client Phone Number</label>
                <input
                  id="report-phone"
                  className="form-input"
                  type="tel"
                  placeholder="Enter client phone number (optional)"
                  value={clientPhone}
                  maxLength={15}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
                <div className={`char-count ${clientPhone.length >= 15 ? 'at-limit' : ''}`}>
                  {clientPhone.length}/15
                </div>
              </div>
            )}

            {/* Client Business Name */}
            {!prefilledClientName && (
              <div className="form-group">
                <label className="form-label" htmlFor="report-business">Client Business Name</label>
                <input
                  id="report-business"
                  className="form-input"
                  type="text"
                  placeholder="Enter client business name (optional)"
                  value={clientBusinessName}
                  maxLength={100}
                  onChange={(e) => setClientBusinessName(e.target.value)}
                />
                <div className={`char-count ${clientBusinessName.length >= 100 ? 'at-limit' : ''}`}>
                  {clientBusinessName.length}/100
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="report-amount">Amount (INR)</label>
              <div className="amount-input-wrapper">
                <span className="amount-prefix">₹</span>
                <input
                  id="report-amount"
                  className="form-input"
                  type="number"
                  placeholder="Total Amt (optional)"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: isGreen ? '#10b981' : 'transparent',
                    color: isGreen ? '#ffffff' : 'var(--text-primary)',
                    borderColor: '#10b981',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    fontWeight: 'bold',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsGreen(true)}
                >
                  🟢 Plus (Green)
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    flex: 1,
                    backgroundColor: !isGreen ? '#ef4444' : 'transparent',
                    color: !isGreen ? '#ffffff' : 'var(--text-primary)',
                    borderColor: '#ef4444',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    fontWeight: 'bold',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsGreen(false)}
                >
                  🔴 Minus (Red)
                </button>
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="report-date">Report Date</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="report-date"
                  className="form-input"
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Next Report Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="next-report-date">Next Report Date (Optional Reminder)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="next-report-date"
                  className="form-input"
                  type="date"
                  value={nextReportDate}
                  min={today()}
                  onChange={(e) => setNextReportDate(e.target.value)}
                />
              </div>
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label" htmlFor="report-note">Note</label>
              <input
                id="report-note"
                className="form-input"
                type="text"
                placeholder="Note (optional, max 20 chars)"
                value={note}
                maxLength={MAX_NOTE}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className={`char-count ${note.length >= MAX_NOTE ? 'at-limit' : ''}`}>
                {note.length}/{MAX_NOTE}
              </div>
            </div>

            {/* Short Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="report-desc">Short Description</label>
              <textarea
                id="report-desc"
                className="form-input"
                placeholder="Brief description (optional)"
                value={shortDesc}
                maxLength={MAX_DESC}
                rows={3}
                onChange={(e) => setShortDesc(e.target.value)}
                style={{ resize: 'vertical' }}
              />
              <div className={`char-count ${shortDesc.length >= MAX_DESC ? 'at-limit' : shortDesc.length >= 160 ? 'near-limit' : ''}`}>
                {shortDesc.length}/{MAX_DESC}
              </div>
            </div>

            {/* Image Upload */}
            <div className="form-group">
              <label className="form-label">
                Images (optional, up to {MAX_IMAGES})
              </label>
              {images.length < MAX_IMAGES && (
                <div className="image-picker">
                  <input
                    id="report-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImages}
                  />
                  <div className="image-picker-text">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 6px', opacity: 0.5 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p>Click to select images</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>{images.length}/{MAX_IMAGES} selected</p>
                  </div>
                </div>
              )}
              {previews.length > 0 && (
                <div className="image-previews-container">
                  {previews.map((src, idx) => (
                    <div key={idx} className="image-preview-item">
                      <div className="image-preview-thumb">
                        <img src={src} alt={`Preview ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-thumb"
                          onClick={() => removeImage(idx)}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      <div className="image-preview-caption-wrapper">
                        <textarea
                          className="form-input caption-input"
                          placeholder="Image caption (max 200 chars) *"
                          value={captions[idx] || ''}
                          maxLength={200}
                          rows={2}
                          style={{ resize: 'none', minHeight: '60px' }}
                          onChange={(e) => {
                            const newCaptions = [...captions];
                            newCaptions[idx] = e.target.value;
                            setCaptions(newCaptions);
                          }}
                          required
                        />
                        <div className={`char-count ${(captions[idx] || '').length >= 200 ? 'at-limit' : (captions[idx] || '').length >= 160 ? 'near-limit' : ''}`}>
                          {(captions[idx] || '').length}/200
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              id="submit-report-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
