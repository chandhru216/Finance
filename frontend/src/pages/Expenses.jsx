import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, LOAN_TYPES } from '../utils/helpers';

const EMPTY_FORM = { title: '', amount: '', category: 'food', date: new Date().toISOString().slice(0,10), description: '', loan: '' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ loanId: '', category: '', startDate: '', endDate: '' });
  const [total, setTotal] = useState(0);

  // ─── CHANGE 1 (frontend): Track selected loan's remaining balance ───
  const [selectedLoanInfo, setSelectedLoanInfo] = useState(null);
  const [amountError, setAmountError] = useState('');
  // ────────────────────────────────────────────────────────────────────

  useEffect(() => { fetchLoans(); }, []);
  useEffect(() => { fetchExpenses(); }, [filters]);

  const fetchLoans = async () => {
    const res = await api.get('/loans');
    setLoans(res.data.loans);
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k === 'loanId' ? 'loanId' : k, v));
      const res = await api.get(`/expenses?${params}`);
      setExpenses(res.data.expenses);
      setTotal(res.data.total);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSelectedLoanInfo(null);
    setAmountError('');
    setModal('add');
  };

  const openEdit = (exp) => {
    setSelected(exp);
    setForm({
      title: exp.title,
      amount: exp.amount,
      category: exp.category,
      date: exp.date?.slice(0, 10) || '',
      description: exp.description || '',
      loan: exp.loan?._id || ''
    });
    // Load loan info for edit too
    const loanData = loans.find(l => l._id === exp.loan?._id);
    setSelectedLoanInfo(loanData || null);
    setAmountError('');
    setModal('edit');
  };

  const openDelete = (exp) => { setSelected(exp); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setSelectedLoanInfo(null); setAmountError(''); };

  // ─── CHANGE 1 (frontend): When loan is selected, load its remaining balance ───
  const handleLoanChange = (e) => {
    const loanId = e.target.value;
    setForm(prev => ({ ...prev, loan: loanId, amount: '' }));
    setAmountError('');
    if (loanId) {
      const loanData = loans.find(l => l._id === loanId);
      setSelectedLoanInfo(loanData || null);
    } else {
      setSelectedLoanInfo(null);
    }
  };

  // ─── CHANGE 1 (frontend): Validate amount against remaining balance live ───
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setForm(prev => ({ ...prev, amount: val }));
    setAmountError('');

    if (selectedLoanInfo && val) {
      const enteredAmount = parseFloat(val);
      const remaining = selectedLoanInfo.remainingBalance ?? (selectedLoanInfo.amount - (selectedLoanInfo.totalExpenses || 0));

      // For edit: add back the current expense amount to remaining
      let effectiveRemaining = remaining;
      if (modal === 'edit' && selected) {
        effectiveRemaining = remaining + (selected.amount || 0);
      }

      if (enteredAmount <= 0) {
        setAmountError('Amount must be greater than 0.');
      } else if (effectiveRemaining <= 0) {
        setAmountError(`❌ Loan limit fully used. No balance remaining for "${selectedLoanInfo.title}".`);
      } else if (enteredAmount > effectiveRemaining) {
        setAmountError(`❌ Amount exceeds remaining balance of ${formatCurrency(effectiveRemaining)} for this loan. You cannot exceed the loan limit.`);
      }
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.loan) return toast.error('Please select a loan');

    // ─── CHANGE 1 (frontend): Block submit if amount error exists ───
    if (amountError) return toast.error('Fix the amount error before submitting.');

    // Extra guard: check remaining balance client-side before hitting backend
    if (selectedLoanInfo && form.amount) {
      const enteredAmount = parseFloat(form.amount);
      const remaining = selectedLoanInfo.remainingBalance ?? (selectedLoanInfo.amount - (selectedLoanInfo.totalExpenses || 0));
      let effectiveRemaining = remaining;
      if (modal === 'edit' && selected) effectiveRemaining = remaining + (selected.amount || 0);

      if (enteredAmount > effectiveRemaining) {
        return toast.error(`Cannot add expense. Only ${formatCurrency(effectiveRemaining)} remaining on this loan.`);
      }
    }
    // ────────────────────────────────────────────────────────────────

    setSaving(true);
    try {
      if (modal === 'add') {
        await api.post('/expenses', form);
        toast.success('Expense added!');
      } else {
        await api.put(`/expenses/${selected._id}`, form);
        toast.success('Expense updated!');
      }
      fetchLoans(); // refresh loan balances
      fetchExpenses();
      closeModal();
    } catch (err) {
      // Backend error message shown clearly
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/expenses/${selected._id}`);
      toast.success('Expense deleted');
      fetchLoans();
      fetchExpenses();
      closeModal();
    } catch { toast.error('Delete failed'); }
    finally { setSaving(false); }
  };

  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const setFilter = k => e => setFilters({ ...filters, [k]: e.target.value });
  const clearFilters = () => setFilters({ loanId: '', category: '', startDate: '', endDate: '' });
  const hasFilters = Object.values(filters).some(Boolean);
  const filteredTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // ─── CHANGE 1 (frontend): Compute remaining for selected loan (used in modal UI) ───
  const getEffectiveRemaining = () => {
    if (!selectedLoanInfo) return null;
    const remaining = selectedLoanInfo.remainingBalance ?? (selectedLoanInfo.amount - (selectedLoanInfo.totalExpenses || 0));
    if (modal === 'edit' && selected) return remaining + (selected.amount || 0);
    return remaining;
  };
  const effectiveRemaining = getEffectiveRemaining();
  // ────────────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track all your loan-linked spending</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: '1 1 160px' }}>
            <label className="form-label">Filter by Loan</label>
            <select className="form-input" value={filters.loanId} onChange={setFilter('loanId')}>
              <option value="">All Loans</option>
              {loans.map(l => <option key={l._id} value={l._id}>{l.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">Category</label>
            <select className="form-input" value={filters.category} onChange={setFilter('category')}>
              <option value="">All Categories</option>
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" value={filters.startDate} onChange={setFilter('startDate')} />
          </div>
          <div className="form-group" style={{ flex: '1 1 140px' }}>
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" value={filters.endDate} onChange={setFilter('endDate')} />
          </div>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginBottom: 1 }}>✕ Clear</button>
          )}
        </div>
        {hasFilters && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, fontSize: 13, color: 'var(--text2)' }}>
            Showing <strong>{expenses.length}</strong> expenses · Total: <strong style={{ color: 'var(--red)' }}>{formatCurrency(filteredTotal)}</strong>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: 'var(--text2)' }}>{total} total expenses</span>
          <span style={{ fontWeight: 700, color: 'var(--red)', fontSize: 15 }}>
            Total: {formatCurrency(filteredTotal)}
          </span>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <div className="empty-title">No expenses found</div>
            <div className="empty-desc">Add expenses linked to your loans</div>
            <button className="btn btn-primary mt-4" onClick={openAdd}>+ Add Expense</button>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Loan</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const cat = EXPENSE_CATEGORIES[exp.category];
                  return (
                    <tr key={exp._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{exp.title}</div>
                        {exp.description && <div className="text-xs text-3 mt-1">{exp.description}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{ background: cat?.color + '22', color: cat?.color }}>
                          {cat?.icon} {cat?.label || exp.category}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13 }}>
                          <span>{LOAN_TYPES[exp.loan?.type]?.icon} </span>
                          {exp.loan?.title || '—'}
                        </div>
                      </td>
                      <td className="text-sm text-2">{formatDate(exp.date)}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--red)' }}>−{formatCurrency(exp.amount)}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(exp)} title="Edit">✏️</button>
                          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openDelete(exp)} title="Delete">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{modal === 'add' ? '+ Add Expense' : '✏️ Edit Expense'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Loan selector */}
              <div className="form-group">
                <label className="form-label">Linked Loan *</label>
                <select className="form-input" value={form.loan} onChange={handleLoanChange} required>
                  <option value="">Select a loan</option>
                  {loans.map(l => (
                    <option key={l._id} value={l._id} disabled={(l.remainingBalance ?? (l.amount - (l.totalExpenses || 0))) <= 0}>
                      {LOAN_TYPES[l.type]?.icon} {l.title}
                      {(l.remainingBalance ?? (l.amount - (l.totalExpenses || 0))) <= 0 ? ' (Limit Reached)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ─── CHANGE 1 (frontend): Show loan balance info box when a loan is selected ─── */}
              {selectedLoanInfo && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: effectiveRemaining <= 0
                    ? 'var(--red-soft)'
                    : effectiveRemaining < selectedLoanInfo.amount * 0.2
                    ? 'var(--yellow-soft)'
                    : 'var(--green-soft)',
                  border: `1px solid ${effectiveRemaining <= 0 ? 'rgba(255,91,127,0.3)' : effectiveRemaining < selectedLoanInfo.amount * 0.2 ? 'rgba(251,191,36,0.3)' : 'rgba(16,217,126,0.3)'}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  fontSize: 13,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {effectiveRemaining <= 0 ? '🚫 Loan Limit Reached' : '💰 Available Balance'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Used: {formatCurrency(selectedLoanInfo.totalExpenses || 0)} of {formatCurrency(selectedLoanInfo.amount)}
                    </div>
                  </div>
                  <div style={{
                    fontWeight: 800, fontSize: 16,
                    color: effectiveRemaining <= 0 ? 'var(--red)' : effectiveRemaining < selectedLoanInfo.amount * 0.2 ? 'var(--yellow)' : 'var(--green)',
                  }}>
                    {formatCurrency(Math.max(effectiveRemaining, 0))}
                  </div>
                </div>
              )}
              {/* ────────────────────────────────────────────────────────────────────────────── */}

              <div className="form-group">
                <label className="form-label">Expense Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Semester Fees" value={form.title} onChange={set('title')} required />
              </div>

              <div className="grid-2">
                {/* ─── CHANGE 1 (frontend): Amount field with live validation ─── */}
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="5000"
                    value={form.amount}
                    onChange={handleAmountChange}
                    required
                    min="0.01"
                    step="0.01"
                    max={effectiveRemaining > 0 ? effectiveRemaining : undefined}
                    style={{ borderColor: amountError ? 'var(--red)' : undefined }}
                    disabled={selectedLoanInfo && effectiveRemaining <= 0}
                  />
                  {amountError && (
                    <div style={{ marginTop: 5, fontSize: 12, color: 'var(--red)', lineHeight: 1.4 }}>
                      {amountError}
                    </div>
                  )}
                </div>
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-input" value={form.date} onChange={set('date')} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select className="form-input" value={form.category} onChange={set('category')} required>
                  {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" placeholder="Additional details..." value={form.description} onChange={set('description')} rows={2} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                {/* ─── CHANGE 1 (frontend): Disable submit if amount error or limit reached ─── */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !!amountError || (selectedLoanInfo && effectiveRemaining <= 0)}
                >
                  {saving ? <><div className="spinner" /> Saving...</> : modal === 'add' ? '+ Add Expense' : 'Save Changes'}
                </button>
                {/* ──────────────────────────────────────────────────────────────────────────── */}
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
              <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
              <h2 className="modal-title" style={{ marginBottom: 12 }}>Delete Expense?</h2>
              <p className="text-2">Delete <strong>"{selected?.title}"</strong> ({formatCurrency(selected?.amount)})?</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? <><div className="spinner" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
