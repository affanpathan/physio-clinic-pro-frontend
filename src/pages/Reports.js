import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZES = [25, 50, 75, 100];

const displayDate = (d) => {
  if (!d) return '—';
  if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d.slice(0, 10);
  return '—';
};

export default function Reports() {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entryType, setEntryType] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [patientId, setPatientId] = useState('');
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState([]);

  const [therapists, setTherapists] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [applied, setApplied] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/therapists`).then(r => r.json()).then(d => setTherapists(Array.isArray(d) ? d : [])).catch(() => setTherapists([]));
  }, []);

  useEffect(() => {
    if (patSearch.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(patSearch)}`)
        .then(r => r.json()).then(setPatResults).catch(() => setPatResults([]));
    } else {
      setPatResults([]);
    }
  }, [patSearch]);

  const selectPatient = (p) => {
    setPatientId(p.id);
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatResults([]);
  };

  const clearPatient = () => {
    setPatientId(''); setPatSearch(''); setPatResults([]);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patResults, selectPatient, () => setPatResults([]));

  useEffect(() => {
    if (!applied) return;
    setLoading(true); setError('');
    const controller = new AbortController();
    const params = new URLSearchParams({ date_from: applied.dateFrom, date_to: applied.dateTo, page: String(page), pageSize: String(pageSize) });
    if (applied.entryType) params.set('entry_type', applied.entryType);
    if (applied.therapistName) params.set('therapist_name', applied.therapistName);
    if (applied.patientId) params.set('patient_id', applied.patientId);
    if (applied.paymentMethod) params.set('payment_method', applied.paymentMethod);

    fetch(`${API_URL}/reports?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d.error || 'Failed to load report');
        setRows(Array.isArray(d.rows) ? d.rows : []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
        setSummary(d.summary || null);
        setLoading(false);
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        setError(e.message); setLoading(false);
      });

    return () => controller.abort();
  }, [applied, page, pageSize]);

  const handleSearch = () => {
    setTouched(true);
    if (!dateFrom || !dateTo) return;
    setPage(1);
    setApplied({ dateFrom, dateTo, entryType, therapistName, patientId, paymentMethod });
  };

  const changePageSize = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Filter and review clinic income &amp; expense records</p>
      </div>

      <div className="toolbar" style={{ flexWrap: 'wrap', rowGap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>From</label>
          <input type="date" className="form-input" style={{ width: 'auto' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>To</label>
          <input type="date" className="form-input" style={{ width: 'auto' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Type</label>
          <select className="form-select" style={{ width: 130 }} value={entryType} onChange={e => setEntryType(e.target.value)}>
            <option value="">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Therapist</label>
          <select className="form-select" style={{ width: 160 }} value={therapistName} onChange={e => setTherapistName(e.target.value)}>
            <option value="">All</option>
            {therapists.map(t => <option key={t.id} value={t.therapist_name}>{t.therapist_name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Patient</label>
          <input
            type="text"
            className="form-input"
            style={{ width: 160 }}
            placeholder="Search patient..."
            value={patSearch}
            onChange={e => { setPatSearch(e.target.value); if (patientId) setPatientId(''); }}
            onKeyDown={onPatSearchKeyDown}
          />
          {patientId && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={clearPatient} title="Clear patient">
              <X size={14} />
            </button>
          )}
          {patResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 60, zIndex: 20, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, boxShadow: 'var(--shadow-md)', marginTop: 2, minWidth: 200, maxHeight: 220, overflowY: 'auto' }}>
              {patResults.map((p, i) => (
                <div
                  key={p.id}
                  onMouseDown={() => selectPatient(p)}
                  onMouseEnter={() => setPatHighlight(i)}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, background: i === patHighlight ? 'var(--teal-50)' : '#fff' }}
                >
                  {p.first_name} {p.last_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Payment Mode</label>
          <select className="form-select" style={{ width: 140 }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="online">Online / UPI</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handleSearch}>Search</button>
      </div>

      {touched && (!dateFrom || !dateTo) && (
        <div className="alert alert-error" style={{ marginTop: 4 }}>From Date and To Date are required.</div>
      )}
      {error && <div className="alert alert-error" style={{ marginTop: 4 }}>{error}</div>}

      {summary && (
        <div className="ledger-summary">
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Total Income</span>
            <span className="ledger-summary-value" style={{ color: 'var(--green)' }}>{fmt(summary.totalIncome)}</span>
          </div>
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Total Expense</span>
            <span className="ledger-summary-value" style={{ color: 'var(--coral)' }}>{fmt(summary.totalExpense)}</span>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', margin: '0 8px' }} />
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Grand Total</span>
            <span className="ledger-summary-value" style={{ color: summary.grandTotal >= 0 ? 'var(--green)' : 'var(--coral)' }}>{fmt(summary.grandTotal)}</span>
          </div>
          <div style={{ borderLeft: '1px solid var(--border)', margin: '0 8px' }} />
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Cash Amount</span>
            <span className="ledger-summary-value" style={{ color: 'var(--gold)' }}>{fmt(summary.cashAmount)}</span>
          </div>
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Online Amount</span>
            <span className="ledger-summary-value" style={{ color: '#4338CA' }}>{fmt(summary.onlineAmount)}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        {!applied ? (
          <div className="empty-state"><p>Select a From Date and To Date, then click Search to generate a report.</p></div>
        ) : loading ? (
          <div className="empty-state"><p>Loading report...</p></div>
        ) : rows.length === 0 ? (
          <div className="empty-state"><p>No records found for the selected filters.</p></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Patient</th>
                    <th>Therapist</th>
                    <th>Payment</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayDate(r.entry_date)}</td>
                      <td><span className={`badge badge-${r.entry_type}`}>{r.entry_type}</span></td>
                      <td style={{ color: 'var(--slate)', fontSize: 13 }}>{r.visit_id ? '—' : (r.category || '—')}</td>
                      <td style={{ fontSize: 13 }}>{r.description || '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{r.first_name ? `${r.first_name} ${r.last_name}` : '—'}</td>
                      <td style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{r.visit_id ? (r.therapist_name || '—') : '—'}</td>
                      <td><span className={`badge badge-${r.payment_method}`}>{r.payment_method}</span></td>
                      <td>
                        <span className={r.entry_type === 'income' ? 'amount-income' : 'amount-expense'}>
                          {r.entry_type === 'income' ? '+' : '-'}{fmt(r.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 4px', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Rows per page</label>
                <select className="form-select" style={{ width: 90 }} value={pageSize} onChange={changePageSize}>
                  {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--slate-light)' }}>
                  Showing {rangeStart}–{rangeEnd} of {total}
                </span>
                <button className="btn btn-ghost btn-sm btn-icon" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm btn-icon" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
