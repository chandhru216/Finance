import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, LOAN_TYPES, getUtilizationColor } from '../utils/helpers';
import './Loans.css';

const EMPTY_FORM = {
  title: '', amount: '', type: 'personal', interestRate: '',
  startDate: '', emiAmount: '', emiDuration: '', emiDay: 1,
  lender: '', purpose: '', notes: ''
};

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchLoans(); }, []);

  const fetchLoans = async () => {
    try {
      const res = await api.get('/loans');
      setLoans(res.data.loans);
    } catch { toast.error('Failed to load loans'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY_FORM); setModal('add'); };
  const openEdit = (loan) => {
    setSelected(loan);
    setForm({
      title: loan.title, amount: loan.amount, type: loan.type,
      interestRate: loan.interestRate || '', startDate: loan.startDate?.slice(0, 10) || '',
      emiAmount: loan.emiAmount, emiDuration: loan.emiDuration,
      emiDay: loan.emiDay || 1, lender: loan.lender || '',
      purpose: loan.purpose || '', notes: loan.notes || ''
    });
    setModal('edit');
  };
  const openDelete = (loan) => { setSelected(loan); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/loans', form);
        toast.success('Loan added successfully!');
      } else {
        await api.put(`/loans/${selected._id}`, form);
        toast.success('Loan updated!');
      }
      fetchLoans(); closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/loans/${selected._id}`);
      toast.success('Loan deleted');
      fetchLoans(); closeModal();
    } catch { toast.error('Delete failed'); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="loans-page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Loans</h1>
          <p className="page-subtitle">Manage and track all your active loans</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Loan</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : loans.length === 0 ? (
        <div className="card empty-state" style={{ padding: 80 }}>
          <div className="empty-icon">🏦</div>
          <div className="empty-title">No loans yet</div>
          <div className="empty-desc">Add your first loan to start tracking utilization</div>
          <button className="btn btn-primary mt-4" onClick={openAdd}>+ Add Your First Loan</button>
        </div>
      ) : (
        <div className="loans-grid">
          {loans.map(loan => {
            const info = LOAN_TYPES[loan.type] || LOAN_TYPES.other;
            return (
              <div key={loan._id} className="loan-card card">
                <div className="loan-card-header">
                  <div className="loan-type-badge">
                    <span className="loan-type-icon">{info.icon}</span>
                    <span>{info.label}</span>
                  </div>
                  <div className={`badge badge-${loan.status === 'active' ? 'green' : loan.status === 'closed' ? 'blue' : 'red'}`}>
                    {loan.status}
                  </div>
                </div>

                <h3 className="loan-title">{loan.title}</h3>
                {loan.lender && <p className="loan-lender">🏛 {loan.lender}</p>}

                <div className="loan-amount-row">
                  <div>
                    <div className="text-xs text-3">Loan Amount</div>
                    <div className="loan-amount">{formatCurrency(loan.amount)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-xs text-3">Remaining</div>
                    <div style={{ fontWeight: 700, color: 'var(--green)' }}>{formatCurrency(loan.remainingBalance)}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs text-3">Utilization</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: getUtilizationColor(loan.utilizationPercent) }}>
                      {loan.utilizationPercent?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${loan.utilizationPercent}%`, background: getUtilizationColor(loan.utilizationPercent) }} />
                  </div>
                </div>

                <div className="loan-meta-grid">
                  <div className="loan-meta-item">
                    <div className="text-xs text-3">EMI</div>
                    <div className="text-sm font-medium">{formatCurrency(loan.emiAmount)}/mo</div>
                  </div>
                  <div className="loan-meta-item">
                    <div className="text-xs text-3">Duration</div>
                    <div className="text-sm font-medium">{loan.emiDuration} months</div>
                  </div>
                  <div className="loan-meta-item">
                    <div className="text-xs text-3">Start Date</div>
                    <div className="text-sm font-medium">{formatDate(loan.startDate)}</div>
                  </div>
                  <div className="loan-meta-item">
                    <div className="text-xs text-3">EMI Day</div>
                    <div className="text-sm font-medium">{loan.emiDay}th</div>
                  </div>
                </div>

                <div className="loan-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(loan)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => openDelete(loan)}>🗑 Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'add' ? '+ Add New Loan' : '✏️ Edit Loan'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Loan Title *</label>
                  <input type="text" className="form-input" placeholder="e.g. MBA Education Loan" value={form.title} onChange={set('title')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Loan Type *</label>
                  <select className="form-input" value={form.type} onChange={set('type')} required>
                    {Object.entries(LOAN_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Loan Amount (₹) *</label>
                  <input type="number" className="form-input" placeholder="500000" value={form.amount} onChange={set('amount')} required min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest Rate (%)</label>
                  <input type="number" className="form-input" placeholder="8.5" value={form.interestRate} onChange={set('interestRate')} min="0" step="0.1" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">EMI Amount (₹) *</label>
                  <input type="number" className="form-input" placeholder="12500" value={form.emiAmount} onChange={set('emiAmount')} required min="1" />
                </div>
                <div className="form-group">
                  <label className="form-label">EMI Duration (months) *</label>
                  <input type="number" className="form-input" placeholder="48" value={form.emiDuration} onChange={set('emiDuration')} required min="1" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-input" value={form.startDate} onChange={set('startDate')} required />
                </div>
                <div className="form-group">
                  <label className="form-label">EMI Due Day (1–31)</label>
                  <input type="number" className="form-input" placeholder="5" value={form.emiDay} onChange={set('emiDay')} min="1" max="31" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Lender / Bank</label>
                  <input type="text" className="form-input" placeholder="e.g. SBI Bank" value={form.lender} onChange={set('lender')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={form.status} onChange={set('status')}>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                    <option value="defaulted">Defaulted</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Purpose / Notes</label>
                <textarea className="form-input" placeholder="What is this loan for?" value={form.purpose} onChange={set('purpose')} rows={2} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : modal === 'add' ? '+ Add Loan' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {modal === 'delete' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 className="modal-title" style={{ marginBottom: 12 }}>Delete Loan?</h2>
              <p className="text-2" style={{ marginBottom: 8 }}>
                This will permanently delete <strong>"{selected?.title}"</strong> and all associated expenses.
              </p>
              <p className="text-sm text-3">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? <><div className="spinner" /> Deleting...</> : '🗑 Delete Loan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
