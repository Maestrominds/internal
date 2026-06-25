import { useState } from 'react';
import { updateReport } from '../api/reports';
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

export default function EditReportModal({ report, onClose, onSuccess }) {
  const [clientName, setClientName] = useState(report.client_name || '');
  const [clientPhone, setClientPhone] = useState(report.client_phone || '');
  const [clientBusinessName, setClientBusinessName] = useState(report.client_business_name || '');
  const [amount, setAmount] = useState(report.amount || '');
  const [note, setNote] = useState(report.note || '');
  const [shortDesc, setShortDesc] = useState(report.short_desc || '');
  const [date, setDate] = useState(
    report.report_date ? report.report_date.split('T')[0] : today()
  );
  const [nextReportDate, setNextReportDate] = useState(
    report.next_report_date ? report.next_report_date.split('T')[0] : ''
  );

  // Existing images state
  const [existingImages] = useState(report.images || []);
  const [deletedImageIds, setDeletedImageIds] = useState([]);

  // New images state
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [newCaptions, setNewCaptions] = useState([]);
  const [isGreen, setIsGreen] = useState(report.is_green !== false);
  const [loading, setLoading] = useState(false);

  const activeExistingCount = existingImages.filter(
    (img) => !deletedImageIds.includes(img.id)
  ).length;
  const totalActiveCount = activeExistingCount + newImages.length;

  async function handleNewImages(e) {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - totalActiveCount;
    const toAdd = files.slice(0, remaining);

    if (files.length > remaining) {
      toast.error(`Max ${MAX_IMAGES} images allowed in total`);
    }

    setLoading(true);
    try {
      const compressedFiles = await Promise.all(toAdd.map(file => compressImage(file)));
      setNewImages((prev) => [...prev, ...compressedFiles]);
      setNewCaptions((prev) => [...prev, ...compressedFiles.map(() => '')]);
      compressedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => setNewPreviews((prev) => [...prev, ev.target.result]);
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

  function removeNewImage(idx) {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => prev.filter((_, i) => i !== idx));
    setNewCaptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleDeleteExisting(id) {
    setDeletedImageIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (amount && parseFloat(amount) < 0) {
      return toast.error('Amount must be greater than or equal to 0');
    }

    // Validate captions for new images
    for (let i = 0; i < newImages.length; i++) {
      const cap = newCaptions[i];
      if (!cap || !cap.trim()) {
        return toast.error(`Please provide a caption for new image #${i + 1}`);
      }
      if (cap.length > 200) {
        return toast.error(`Caption for new image #${i + 1} must be 200 characters or less`);
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
    formData.append('deleted_image_ids', JSON.stringify(deletedImageIds));
    newImages.forEach((img) => formData.append('images', img));
    newCaptions.forEach((cap) => formData.append('captions', cap.trim()));

    try {
      await updateReport(report.id, formData);
      toast.success('Report updated successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Edit Report</h3>
          <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Client Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-client">Client Name</label>
              <input
                id="edit-client"
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

            {/* Client Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-phone">Client Phone Number</label>
              <input
                id="edit-phone"
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

            {/* Client Business Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-business">Client Business Name</label>
              <input
                id="edit-business"
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

            {/* Amount */}
            <div className="form-group">
              <label className="form-label" htmlFor="edit-amount">Amount (INR)</label>
              <div className="amount-input-wrapper">
                <span className="amount-prefix">₹</span>
                <input
                  id="edit-amount"
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
              <label className="form-label" htmlFor="edit-date">Report Date</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="edit-date"
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
              <label className="form-label" htmlFor="edit-next-report-date">Next Report Date (Optional Reminder)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="edit-next-report-date"
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
              <label className="form-label" htmlFor="edit-note">Note</label>
              <input
                id="edit-note"
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
              <label className="form-label" htmlFor="edit-desc">Short Description</label>
              <textarea
                id="edit-desc"
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

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className="form-group">
                <label className="form-label">Existing Images (Select to delete)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                  {existingImages.map((img) => {
                    const isDeleted = deletedImageIds.includes(img.id);
                    return (
                      <div
                        key={img.id}
                        onClick={() => toggleDeleteExisting(img.id)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: isDeleted ? '3px solid var(--danger-color, #dc3545)' : '1px solid var(--border-color, #ccc)',
                          opacity: isDeleted ? 0.4 : 1,
                        }}
                      >
                        <img
                          src={img.cloudinary_url}
                          alt={img.caption}
                          style={{ width: '100%', height: '80px', objectFit: 'cover' }}
                        />
                        {isDeleted && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0, left: 0, right: 0, bottom: 0,
                              background: 'rgba(220, 53, 69, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                            }}
                          >
                            DELETING
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: '0.7rem',
                            padding: '4px',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {img.caption}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upload New Images */}
            <div className="form-group">
              <label className="form-label">
                Upload New Images (Max total {MAX_IMAGES})
              </label>
              {totalActiveCount < MAX_IMAGES && (
                <div className="image-picker">
                  <input
                    id="edit-new-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleNewImages}
                  />
                  <div className="image-picker-text">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 6px', opacity: 0.5 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <p>Click to select new images</p>
                    <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Total active: {totalActiveCount}/{MAX_IMAGES}</p>
                  </div>
                </div>
              )}
              {newPreviews.length > 0 && (
                <div className="image-previews-container">
                  {newPreviews.map((src, idx) => (
                    <div key={idx} className="image-preview-item">
                      <div className="image-preview-thumb">
                        <img src={src} alt={`New Preview ${idx + 1}`} />
                        <button
                          type="button"
                          className="remove-thumb"
                          onClick={() => removeNewImage(idx)}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                      <div className="image-preview-caption-wrapper">
                        <textarea
                          className="form-input caption-input"
                          placeholder="New image caption *"
                          value={newCaptions[idx] || ''}
                          maxLength={200}
                          rows={2}
                          style={{ resize: 'none', minHeight: '60px' }}
                          onChange={(e) => {
                            const newCaps = [...newCaptions];
                            newCaps[idx] = e.target.value;
                            setNewCaptions(newCaps);
                          }}
                          required
                        />
                        <div className={`char-count ${(newCaptions[idx] || '').length >= 200 ? 'at-limit' : (newCaptions[idx] || '').length >= 160 ? 'near-limit' : ''}`}>
                          {(newCaptions[idx] || '').length}/200
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
              id="submit-edit-report-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
