import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Download } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { truncateNote } from '../utils/text';
import { getProductRows } from '../utils/products';
import { downloadCsvExport } from '../utils/exportCsv';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZES = [25, 50, 75, 100];
const SALE_CATEGORIES = ['Product Sale', 'Package Sale'];

const displayDate = (d) => {
  if (!d) return '—';
  if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d.slice(0, 10);
  return '—';
};

function buildReportQueryParams({ dateFrom, dateTo, entryType, therapistName, patientId, paymentMethod, bankId, productId }) {
  const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
  if (entryType === 'sale') { params.set('entry_type', 'income'); params.set('category', SALE_CATEGORIES.join(',')); }
  else if (entryType === 'income_expense') { params.set('exclude_category', [...SALE_CATEGORIES, 'Opening Balance'].join(',')); }
  else if (entryType) { params.set('entry_type', entryType); }
  if (therapistName) params.set('therapist_name', therapistName);
  if (patientId) params.set('patient_id', patientId);
  if (paymentMethod) params.set('payment_method', paymentMethod);
  if (bankId) params.set('bank_id', bankId);
  if (productId) params.set('product_id', productId);
  return params;
}

export default function Reports() {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entryType, setEntryType] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankId, setBankId] = useState('');
  const [banks, setBanks] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [patSearch, setPatSearch] = useState('');
  const [patResults, setPatResults] = useState([]);

  const [therapists, setTherapists] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [applied, setApplied] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [bankTransfers, setBankTransfers] = useState([]);
  const [showBankTransfers, setShowBankTransfers] = useState(false);
  const [btPage, setBtPage] = useState(1);
  const [btPageSize, setBtPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/therapists`).then(r => r.json()).then(d => setTherapists(Array.isArray(d) ? d : [])).catch(() => setTherapists([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/products?active=true`).then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/banks?active=true&with_balance=true`).then(r => r.json()).then(d => setBanks(Array.isArray(d) ? d : [])).catch(() => setBanks([]));
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

  const selectAllPatients = () => {
    setPatientId('all'); setPatSearch('All Patients'); setPatResults([]);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patResults, selectPatient, () => setPatResults([]));

  useEffect(() => {
    if (!applied) return;
    setLoading(true); setError('');
    const controller = new AbortController();
    const params = buildReportQueryParams(applied);
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));

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

  useEffect(() => {
    if (!applied) { setBankTransfers([]); return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ date_from: applied.dateFrom, date_to: applied.dateTo });
    if (applied.bankId) params.set('bank_id', applied.bankId);

    setBtPage(1);
    fetch(`${API_URL}/bank-transfers?${params.toString()}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => setBankTransfers(Array.isArray(d) ? d : []))
      .catch(e => {
        if (e.name === 'AbortError') return;
        setBankTransfers([]);
      });

    return () => controller.abort();
  }, [applied]);

  const btTotalPages = Math.max(1, Math.ceil(bankTransfers.length / btPageSize));
  const pagedBankTransfers = bankTransfers.slice((btPage - 1) * btPageSize, btPage * btPageSize);
  const btRangeStart = bankTransfers.length === 0 ? 0 : (btPage - 1) * btPageSize + 1;
  const btRangeEnd = Math.min(btPage * btPageSize, bankTransfers.length);

  const changeBtPageSize = (e) => {
    setBtPageSize(Number(e.target.value));
    setBtPage(1);
  };

  const handleSearch = () => {
    setTouched(true);
    if (!dateFrom || !dateTo) return;
    setPage(1);
    setApplied({ dateFrom, dateTo, entryType, therapistName, patientId, paymentMethod, bankId, productId });
  };

  const changePageSize = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const handleExport = async () => {
    if (!applied) return;
    setExportError('');
    try {
      const params = buildReportQueryParams(applied);
      await downloadCsvExport(`${API_URL}/reports/export?${params.toString()}`, 'reports_export.csv');
    } catch (e) { setExportError(e.message); }
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
            <option value="sale">Sale</option>
            <option value="income_expense">Income/Expense</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Therapist</label>
          <select className="form-select" style={{ width: 160 }} value={therapistName} onChange={e => setTherapistName(e.target.value)}>
            <option value="">All</option>
            {therapists.map(t => <option key={t.id} value={t.therapist_name}>{t.therapist_name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Product</label>
          <select className="form-select" style={{ width: 160 }} value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">All</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
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
          <button
            className={`btn btn-sm ${patientId === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={selectAllPatients}
            title="Show only records linked to a patient"
          >
            All
          </button>
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Bank</label>
          <select className="form-select" style={{ width: 160 }} value={bankId} onChange={e => setBankId(e.target.value)}>
            <option value="">All</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
          </select>
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={handleSearch}>Search</button>
        <button className="btn btn-secondary" onClick={handleExport} disabled={!applied} title={!applied ? 'Run a search first' : 'Export current results'}>
          <Download size={15} />Export
        </button>
      </div>

      {touched && (!dateFrom || !dateTo) && (
        <div className="alert alert-error" style={{ marginTop: 4 }}>From Date and To Date are required.</div>
      )}
      {error && <div className="alert alert-error" style={{ marginTop: 4 }}>{error}</div>}
      {exportError && <div className="alert alert-error" style={{ marginTop: 4 }}>{exportError}</div>}

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

      {summary?.byBank?.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Income</th>
                  <th>Expense</th>
                  <th>Net</th>
                  <th>Current Balance</th>
                </tr>
              </thead>
              <tbody>
                {summary.byBank.map(b => (
                  <tr key={b.bankId}>
                    <td data-label="Bank">{b.bankName}</td>
                    <td data-label="Income"><span className="amount-income">{fmt(b.income)}</span></td>
                    <td data-label="Expense"><span className="amount-expense">{fmt(b.expense)}</span></td>
                    <td data-label="Net">
                      <span style={{ color: (b.income - b.expense) >= 0 ? 'var(--green)' : 'var(--coral)' }}>
                        {fmt(b.income - b.expense)}
                      </span>
                    </td>
                    <td data-label="Current Balance">{fmt(banks.find(bk => bk.id === b.bankId)?.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bankTransfers.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ marginTop: 0 }}>Bank Transfers ({bankTransfers.length})</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowBankTransfers(v => !v)}>
              {showBankTransfers ? 'Hide' : 'Show'}
            </button>
          </div>
          {showBankTransfers && (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From Bank</th>
                      <th>To Bank</th>
                      <th>Amount</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedBankTransfers.map(t => (
                      <tr key={t.id}>
                        <td data-label="Date">{displayDate(t.transfer_date)}</td>
                        <td data-label="From Bank">{t.from_bank_name}</td>
                        <td data-label="To Bank">{t.to_bank_name}</td>
                        <td data-label="Amount">{fmt(t.amount)}</td>
                        <td data-label="Description">{t.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 4px', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, color: 'var(--slate-light)', margin: 0 }}>Rows per page</label>
                  <select className="form-select" style={{ width: 90 }} value={btPageSize} onChange={changeBtPageSize}>
                    {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--slate-light)' }}>
                    Showing {btRangeStart}–{btRangeEnd} of {bankTransfers.length}
                  </span>
                  <button className="btn btn-ghost btn-sm btn-icon" disabled={btPage <= 1} onClick={() => setBtPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 13 }}>Page {btPage} of {btTotalPages}</span>
                  <button className="btn btn-ghost btn-sm btn-icon" disabled={btPage >= btTotalPages} onClick={() => setBtPage(p => Math.min(btTotalPages, p + 1))}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
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
                    <th>Category / Product</th>
                    <th>Note</th>
                    <th>Description</th>
                    <th>Patient</th>
                    <th>Therapist</th>
                    <th>Payment</th>
                    <th>Bank</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id}>
                      <td data-label="Date" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayDate(r.entry_date)}</td>
                      <td data-label="Type"><span className={`badge badge-${r.entry_type}`}>{r.entry_type}</span></td>
                      <td data-label="Category / Product" style={{ color: 'var(--slate)', fontSize: 13 }}>
                        {r.visit_id ? '—' : (
                          <>
                            {r.category === 'Product Sale' && getProductRows(r).length
                              ? getProductRows(r).map((pl, i) => (
                                  <div key={i}>{pl.product_name} <span style={{ color: 'var(--slate-light)' }}>({fmt(pl.amount)})</span></div>
                                ))
                              : (r.category || '—')}
                            {SALE_CATEGORIES.includes(r.category) && <span className="badge badge-sale" style={{ marginLeft: 6 }}>Sale</span>}
                          </>
                        )}
                      </td>
                      <td data-label="Note" style={{ fontSize: 13 }} title={r.session_notes || ''}>{r.visit_id ? truncateNote(r.session_notes) : '—'}</td>
                      <td data-label="Description" style={{ fontSize: 13 }}>{r.description || '—'}</td>
                      <td data-label="Patient" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{r.first_name ? `${r.first_name} ${r.last_name}` : '—'}</td>
                      <td data-label="Therapist" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{r.visit_id ? (r.therapist_name || '—') : '—'}</td>
                      <td data-label="Payment"><span className={`badge badge-${r.payment_method}`}>{r.payment_method}</span></td>
                      <td data-label="Bank" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{r.bank_name || '—'}</td>
                      <td data-label="Amount">
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
