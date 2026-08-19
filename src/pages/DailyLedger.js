import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getTherapyRows } from '../utils/therapy';
import { truncateNote } from '../utils/text';
import { downloadCsvExport } from '../utils/exportCsv';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Equipment', 'Medicines/Supplies', 'Maintenance', 'Marketing', 'Insurance', 'Miscellaneous'];
const INCOME_CATEGORIES = ['Therapy Fee', 'Consultation', 'Package Sale', 'Product Sale', 'Product Sale Payment', 'Other Income', 'Opening Balance'];
const SALE_CATEGORIES = ['Product Sale', 'Package Sale'];

const EMPTY_ENTRY = {
  entry_date: new Date().toISOString().split('T')[0],
  entry_type: 'expense',
  category: '',
  description: '',
  amount: '',
  payment_method: 'cash',
  bank_id: '',
  reference_number: '',
};

const EMPTY_PRODUCT_LINE = { product_id: '', description: '', amount: '', amount_paid: '' };

const displayDate = (d) => {
  if (!d) return '—';
  if (typeof d === 'string') {
    if (d.includes('T')) return d.split('T')[0];
    if (d.length >= 10) return d.slice(0, 10);
    return d;
  }
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  try { return String(d).slice(0, 10); } catch { return '—'; }
};

const displayTime = (t) => {
  if (!t) return '—';
  if (typeof t === 'string') {
    if (t.includes('T')) return t.split('T')[1]?.slice(0,5) || '—';
    if (t.length >= 5 && t.includes(':')) return t.slice(0,5);
    return t;
  }
  if (t instanceof Date) {
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
  try { return String(t).slice(11,16) || '—'; } catch { return '—'; }
};

export default function DailyLedger() {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtOrDash = n => (n === null || n === undefined || n === '') ? '—' : fmt(n);
  const dueAmount = (fee, paid) => {
    if ((fee === null || fee === undefined || fee === '') && (paid === null || paid === undefined || paid === '')) return '—';
    return fmt((Number(fee) || 0) - (Number(paid) || 0));
  };
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_ENTRY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [viewMode, setViewMode] = useState('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailEntry, setDetailEntry] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patSearch, setPatSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [productLines, setProductLines] = useState([{ ...EMPTY_PRODUCT_LINE }]);
  const [banks, setBanks] = useState([]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    let url = `${API_URL}/ledger?`;
    if (viewMode === 'day') url += `date=${date}`;
    else if (dateFrom && dateTo) url += `date_from=${dateFrom}&date_to=${dateTo}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setEntries(Array.isArray(d) ? d.map(entry => ({
          ...entry,
          fee_charged: entry.fee_charged ?? null,
          amount_paid: entry.amount_paid ?? null,
        })) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date, viewMode, dateFrom, dateTo]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  useEffect(() => {
    if (patSearch.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(patSearch)}`)
        .then(r => r.json()).then(setPatients).catch(() => setPatients([]));
    } else {
      setPatients([]);
    }
  }, [patSearch]);

  useEffect(() => {
    fetch(`${API_URL}/products?active=true`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/banks?active=true`)
      .then(r => r.json())
      .then(d => setBanks(Array.isArray(d) ? d : []))
      .catch(() => setBanks([]));
  }, []);

  const selectPatient = async (p) => {
    setForm(f => ({ ...f, patient_id: p.id }));
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
    if (form.category === 'Product Sale') return; // patient is record-only for a product sale, not a fee to reconcile
    try {
      const res = await fetch(`${API_URL}/patient-ledger/${p.id}`);
      if (!res.ok) return;
      const d = await res.json();
      const bal = d.summary?.balance_due ?? 0;
      setForm(f => ({ ...f, amount: Number(bal) }));
    } catch (err) { /* ignore */ }
  };

  const updateProductLine = (idx, field, value) => {
    setProductLines(lines => lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleProductLineSelect = (idx, productIdStr) => {
    const productId = productIdStr ? Number(productIdStr) : '';
    const prod = productId ? products.find(p => p.id === productId) : null;
    setProductLines(lines => lines.map((l, i) => i === idx ? {
      ...l,
      product_id: productId,
      description: prod ? (prod.description || '') : l.description,
      amount: prod && prod.price ? Number(prod.price) : l.amount,
    } : l));
  };

  const addProductLine = () => setProductLines(lines => [...lines, { ...EMPTY_PRODUCT_LINE }]);
  const removeProductLine = (idx) => setProductLines(lines => lines.length > 1 ? lines.filter((_, i) => i !== idx) : lines);

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patients, selectPatient, () => setPatients([]));

  useEscapeKey(showModal, () => setShowModal(false));
  useEscapeKey(!!detailEntry, () => setDetailEntry(null));

  const shiftDate = (days) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleExport = async () => {
    setExportError('');
    try {
      let qs = viewMode === 'day' ? `date=${date}` : (dateFrom && dateTo ? `date_from=${dateFrom}&date_to=${dateTo}` : '');
      if (statusFilter !== 'all') qs += (qs ? '&' : '') + `entry_type=${statusFilter}`;
      await downloadCsvExport(`${API_URL}/ledger/export${qs ? `?${qs}` : ''}`, 'daily-ledger_export.csv');
    } catch (e) { setExportError(e.message); }
  };

  const handleSave = async () => {
    if (form.category === 'Product Sale') {
      const validLines = productLines
        .map(l => ({ ...l, amount: Number(l.amount) || 0 }))
        .filter(l => l.amount > 0 && (l.product_id || l.description.trim()));
      if (!validLines.length) { setError('Add at least one product with a description and amount.'); return; }
      setSaving(true); setError('');
      try {
        for (const line of validLines) {
          const payload = {
            entry_date: form.entry_date,
            entry_type: 'income',
            category: 'Product Sale',
            description: line.description || '',
            amount: line.amount,
            amount_paid: line.amount_paid || 0,
            payment_method: form.payment_method,
            bank_id: form.bank_id,
            reference_number: form.reference_number,
            patient_id: form.patient_id ? form.patient_id : null,
            product_id: line.product_id ? line.product_id : null,
          };
          const res = await fetch(`${API_URL}/ledger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        }
        setShowModal(false); loadEntries();
      } catch (e) { setError(e.message); }
      setSaving(false);
      return;
    }

    if (!form.description || !form.amount || !form.category) { setError('Description, category, and amount are required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, patient_id: form.patient_id ? form.patient_id : null };
      const res = await fetch(`${API_URL}/ledger`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowModal(false); loadEntries();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`${API_URL}/ledger/${id}`, { method: 'DELETE' });
    loadEntries();
  };

  const openAdd = (type = 'expense') => {
    setForm({ ...EMPTY_ENTRY, entry_date: date, entry_type: type, category: '', patient_id: '' });
    setProductLines([{ ...EMPTY_PRODUCT_LINE }]);
    setError('');
    setPatSearch(''); setPatients([]);
    setShowModal(true);
  };

  const filteredEntries = entries.filter(e => statusFilter === 'all' ? true : e.entry_type === statusFilter);
  // Opening Balance entries seed a starting cash/bank position, not new income/expense —
  // keep them out of these period totals (they still show in the entries table below).
  const summaryEntries = filteredEntries.filter(e => e.category !== 'Opening Balance');
  const income = summaryEntries.filter(e => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0);
  const expenses = summaryEntries.filter(e => e.entry_type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
  const cashIncome = summaryEntries.filter(e => e.entry_type === 'income' && e.payment_method === 'cash').reduce((s, e) => s + Number(e.amount), 0);
  const onlineIncome = summaryEntries.filter(e => e.entry_type === 'income' && e.payment_method === 'online').reduce((s, e) => s + Number(e.amount), 0);
  const cashExpenses = summaryEntries.filter(e => e.entry_type === 'expense' && e.payment_method === 'cash').reduce((s, e) => s + Number(e.amount), 0);
  const onlineExpenses = summaryEntries.filter(e => e.entry_type === 'expense' && e.payment_method === 'online').reduce((s, e) => s + Number(e.amount), 0);
  const net = income - expenses;
  const netCash = cashIncome - cashExpenses;
  const netOnline = onlineIncome - onlineExpenses;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Daily Ledger</h1>
        <p className="page-subtitle">Track clinic income and expenses</p>
      </div>

      <div className="toolbar">
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Day View</button>
          <button className={`tab ${viewMode === 'range' ? 'active' : ''}`} onClick={() => setViewMode('range')}>Date Range</button>
        </div>

        {viewMode === 'day' && (
          <div className="date-nav">
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftDate(-1)}><ChevronLeft size={16} /></button>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftDate(1)}><ChevronRight size={16} /></button>
          </div>
        )}

        {viewMode === 'range' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--slate-light)', fontSize: 13 }}>to</span>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 12 }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Status</label>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: 140, flex: '1 1 auto' }}>
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleExport}><Download size={15} />Export</button>
        <button className="btn btn-secondary" onClick={() => openAdd('income')}><TrendingUp size={15} />Add Income</button>
        <button className="btn btn-primary" onClick={() => openAdd('expense')}><Plus size={15} />Add Expense</button>
      </div>

      {exportError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{exportError}</div>}

      <div className="ledger-summary">
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Total Income</span>
          <span className="ledger-summary-value" style={{ color: 'var(--green)' }}>{fmt(income)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label" style={{ marginLeft: 8 }}>· Cash</span>
          <span className="ledger-summary-value" style={{ color: 'var(--gold)', fontSize: 15 }}>{fmt(cashIncome)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Online</span>
          <span className="ledger-summary-value" style={{ color: '#4338CA', fontSize: 15 }}>{fmt(onlineIncome)}</span>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', margin: '0 8px' }} />
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Total Expenses</span>
          <span className="ledger-summary-value" style={{ color: 'var(--coral)' }}>{fmt(expenses)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label" style={{ marginLeft: 8 }}>· Cash</span>
          <span className="ledger-summary-value" style={{ color: 'var(--gold)', fontSize: 15 }}>{fmt(cashExpenses)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Online</span>
          <span className="ledger-summary-value" style={{ color: '#4338CA', fontSize: 15 }}>{fmt(onlineExpenses)}</span>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', margin: '0 8px' }} />
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Net Balance</span>
          <span className="ledger-summary-value" style={{ color: net >= 0 ? 'var(--green)' : 'var(--coral)' }}>{fmt(net)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label" style={{ marginLeft: 8 }}>· Cash</span>
          <span className="ledger-summary-value" style={{ color: netCash >= 0 ? 'var(--green)' : 'var(--coral)' }}>{fmt(netCash)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Online</span>
          <span className="ledger-summary-value" style={{ color: netOnline >= 0 ? 'var(--green)' : 'var(--coral)' }}>{fmt(netOnline)}</span>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading entries...</p></div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <p>No entries for this period. Add income or expense entries.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th>Therapy</th>
                  <th>Payment</th>
                  <th>Bank</th>
                  <th>Patient</th>
                  <th>Fee Charged</th>
                  <th>Amount</th>
                  <th>Due Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => (
                  <tr key={e.id}>
                    <td data-label="Date" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayDate(e.entry_date)}</td>
                    <td data-label="Time" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayTime(e.created_at)}</td>
                    <td data-label="Type"><span className={`badge badge-${e.entry_type}`}>{e.entry_type}</span></td>
                    <td data-label="Category" style={{ color: 'var(--slate)', fontSize: 13 }}>
                      {e.visit_id ? '—' : (
                        <>
                          {e.category === 'Product Sale' && e.product_name ? e.product_name : e.category}
                          {SALE_CATEGORIES.includes(e.category) && <span className="badge badge-sale" style={{ marginLeft: 6 }}>Sale</span>}
                        </>
                      )}
                    </td>
                    <td data-label="Note" style={{ fontSize: 12.5, color: 'var(--slate)' }} title={e.session_notes || ''}>
                      {e.visit_id ? truncateNote(e.session_notes) : '—'}
                    </td>
                    <td data-label="Therapy" style={{ fontSize: 12.5 }}>
                      {getTherapyRows(e).length
                        ? getTherapyRows(e).map((t, i) => (
                            <div key={i}>{t.therapy_type} <span style={{ color: 'var(--slate-light)' }}>({t.duration_minutes}m)</span></div>
                          ))
                        : '—'}
                    </td>
                    <td data-label="Payment"><span className={`badge badge-${e.payment_method}`}>{e.payment_method}</span></td>
                    <td data-label="Bank" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{e.bank_name || '—'}</td>
                    <td data-label="Patient" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>
                      {e.first_name ? `${e.first_name} ${e.last_name}` : '—'}
                    </td>
                    <td data-label="Fee Charged" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtOrDash(e.fee_charged)}</td>
                    <td data-label="Amount">
                      <span className={e.entry_type === 'income' ? 'amount-income' : 'amount-expense'}>
                        {e.entry_type === 'income' ? '+' : '-'}{fmt(e.amount)}
                      </span>
                    </td>
                    <td data-label="Due Amount" style={{ fontVariantNumeric: 'tabular-nums' }}>{dueAmount(e.fee_charged, e.amount_paid)}</td>
                    <td data-label="Action">
                      <button className="btn btn-secondary btn-sm" onClick={() => setDetailEntry(e)} title="Details" style={{ marginRight: 8 }}>
                        Details
                      </button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(e.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <span className="modal-title">
                {form.entry_type === 'expense' ? 'Add Expense' : 'Add Income Entry'}
              </span>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Entry Type</label>
                  <select className="form-select" value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value, category: '' })}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                {form.entry_type === 'income' && (
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Patient (optional)</label>
                    <input className="form-input" placeholder="Search patient by name..." value={patSearch} onChange={e => { setPatSearch(e.target.value); setForm(f => ({ ...f, patient_id: '' })); }} onKeyDown={onPatSearchKeyDown} />
                    {patients.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, zIndex: 20, boxShadow: 'var(--shadow-md)', marginTop: 2, maxHeight: 220, overflowY: 'auto' }}>
                        {patients.map((p, i) => (
                          <div key={p.id} onClick={() => selectPatient(p)} onMouseEnter={() => setPatHighlight(i)}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13.5, background: i === patHighlight ? 'var(--teal-50)' : '#fff' }}>
                            <div style={{ fontWeight: 600, color: 'var(--teal-900)' }}>{p.first_name} {p.last_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--slate-light)' }}>{p.patient_id} · {p.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={form.category} onChange={e => {
                    const newCategory = e.target.value;
                    const enteringSale = newCategory === 'Product Sale' && form.category !== 'Product Sale';
                    if (enteringSale) setProductLines([{ ...EMPTY_PRODUCT_LINE }]);
                    setForm(f => ({
                      ...f,
                      category: newCategory,
                      amount: enteringSale ? '' : f.amount,
                    }));
                  }}>
                    <option value="">Select category</option>
                    {(form.entry_type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {form.entry_type === 'income' && form.category === 'Product Sale' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Products *</label>
                    {productLines.map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="form-select" style={{ flex: '1.2 1 160px' }} value={line.product_id || ''} onChange={e => handleProductLineSelect(idx, e.target.value)}>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                        </select>
                        <input className="form-input" style={{ flex: '2 1 160px' }} placeholder="Description" value={line.description} onChange={e => updateProductLine(idx, 'description', e.target.value)} />
                        <input type="number" step="0.01" className="form-input" style={{ flex: '1 1 110px', minWidth: 90 }} placeholder={`Charged (${symbol})`} value={line.amount} onChange={e => updateProductLine(idx, 'amount', e.target.value)} />
                        <input type="number" step="0.01" className="form-input" style={{ flex: '1 1 110px', minWidth: 90 }} placeholder={`Paid (${symbol})`} value={line.amount_paid} onChange={e => updateProductLine(idx, 'amount_paid', e.target.value)} />
                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => removeProductLine(idx)} disabled={productLines.length === 1} title="Remove">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addProductLine}><Plus size={14} />Add Product</button>
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--slate-light)' }}>
                      Total Charged: <strong>{fmt(productLines.reduce((s, l) => s + (Number(l.amount) || 0), 0))}</strong>
                      {' · '}Total Paid: <strong>{fmt(productLines.reduce((s, l) => s + (Number(l.amount_paid) || 0), 0))}</strong>
                      {' · '}Total Due: <strong>{fmt(productLines.reduce((s, l) => s + (Number(l.amount) || 0) - (Number(l.amount_paid) || 0), 0))}</strong>
                    </div>
                  </div>
                )}
                {form.category !== 'Product Sale' && (
                  <div className="form-group">
                    <label className="form-label">Amount ({symbol}) *</label>
                    <input type="number" step="0.01" className="form-input" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    <option value="cash">Cash</option>
                    <option value="online">Online / UPI</option>
                  </select>
                </div>
                {form.payment_method === 'online' && (
                  <div className="form-group">
                    <label className="form-label">Bank</label>
                    <select className="form-select" value={form.bank_id || ''} onChange={e => setForm({ ...form, bank_id: e.target.value })}>
                      <option value="">Select bank</option>
                      {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Reference / UPI ID</label>
                  <input className="form-input" placeholder="Optional" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
                </div>
              </div>
              {form.category !== 'Product Sale' && (
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ alignItems: 'center' }}>
              <div style={{ marginRight: 12 }}>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
      {detailEntry && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <span className="modal-title">Entry Details</span>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDetailEntry(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid form-grid-2">
                <div>
                  <strong>Date</strong>
                  <div style={{ marginTop: 6 }}>{displayDate(detailEntry.entry_date)}</div>
                </div>
                <div>
                  <strong>Time</strong>
                  <div style={{ marginTop: 6 }}>{displayTime(detailEntry.created_at)}</div>
                </div>
                <div>
                  <strong>Type</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.entry_type}</div>
                </div>
                <div>
                  <strong>Category</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.visit_id ? '—' : (detailEntry.category === 'Product Sale' && detailEntry.product_name ? detailEntry.product_name : detailEntry.category)}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Description</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.description}</div>
                </div>
                <div>
                  <strong>Amount</strong>
                  <div style={{ marginTop: 6 }}>{fmt(detailEntry.amount)}</div>
                </div>
                <div>
                  <strong>Fee Charged</strong>
                  <div style={{ marginTop: 6 }}>{fmtOrDash(detailEntry.fee_charged)}</div>
                </div>
                <div>
                  <strong>Amount Paid</strong>
                  <div style={{ marginTop: 6 }}>{fmtOrDash(detailEntry.amount_paid)}</div>
                </div>
                <div>
                  <strong>Due Amount</strong>
                  <div style={{ marginTop: 6 }}>{dueAmount(detailEntry.fee_charged, detailEntry.amount_paid)}</div>
                </div>
                <div>
                  <strong>Payment Method</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.payment_method}</div>
                </div>
                {detailEntry.payment_method === 'online' && (
                  <div>
                    <strong>Bank</strong>
                    <div style={{ marginTop: 6 }}>{detailEntry.bank_name || '—'}</div>
                  </div>
                )}
                <div>
                  <strong>Reference</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.reference_number || '—'}</div>
                </div>
                <div>
                  <strong>Patient</strong>
                  <div style={{ marginTop: 6 }}>{detailEntry.first_name ? `${detailEntry.first_name} ${detailEntry.last_name}` : '—'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={() => setDetailEntry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
