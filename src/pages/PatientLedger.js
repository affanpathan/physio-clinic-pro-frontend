import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, CreditCard, Calendar, FileText, Download } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { getTherapyRows } from '../utils/therapy';
import { downloadCsvExport } from '../utils/exportCsv';
const API_URL = process.env.REACT_APP_API_URL || '/api';

export default function PatientLedger({ selectedPatient, setSelectedPatient }) {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('visits');
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (search.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(search)}`)
        .then(r => r.json()).then(setPatients);
    } else setPatients([]);
  }, [search]);

  useEffect(() => {
    if (selectedPatient) {
      loadLedger(selectedPatient.id);
      setSearch(`${selectedPatient.first_name} ${selectedPatient.last_name}`);
    }
  }, [selectedPatient]);

  const loadLedger = (patientId) => {
    setLoading(true);
    fetch(`${API_URL}/patient-ledger/${patientId}`)
      .then(r => r.json())
      .then(d => { setLedger(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
    loadLedger(p.id);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setSearch('');
    setLedger(null);
    setPatients([]);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patients, selectPatient, () => setPatients([]));

  const handleExport = async () => {
    if (!selectedPatient) return;
    setExportError('');
    try {
      await downloadCsvExport(`${API_URL}/patient-ledger/${selectedPatient.id}/export?type=${tab}`, `patient-ledger-${tab}_export.csv`);
    } catch (e) { setExportError(e.message); }
  };

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
      return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
    }
    try { return String(t).slice(11,16) || '—'; } catch { return '—'; }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Ledger</h1>
        <p className="page-subtitle">View complete financial history per patient</p>
      </div>

      <div style={{ maxWidth: 520, position: 'relative', marginBottom: 24 }}>
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            placeholder="Search patient by name, ID, or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) { setSelectedPatient(null); setLedger(null); } }}
            onKeyDown={onPatSearchKeyDown}
            style={{ paddingRight: 36 }}
          />
          {selectedPatient && (
            <button onClick={clearPatient} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)', display: 'flex' }}>
              <X size={15} />
            </button>
          )}
        </div>
        {patients.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, zIndex: 20, boxShadow: 'var(--shadow-md)', marginTop: 2, maxHeight: 220, overflowY: 'auto' }}>
            {patients.map((p, i) => (
              <div key={p.id} onClick={() => selectPatient(p)} onMouseEnter={() => setPatHighlight(i)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13.5, background: i === patHighlight ? 'var(--teal-50)' : '#fff' }}>
                <div style={{ fontWeight: 600, color: 'var(--teal-900)' }}>{p.first_name} {p.last_name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-light)' }}>{p.patient_id} · {p.phone} · {p.diagnosis || 'No diagnosis'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedPatient && (
        <div className="card">
          <div className="empty-state" style={{ padding: 60 }}>
            <Search size={40} />
            <p style={{ marginTop: 8, fontSize: 15 }}>Search and select a patient to view their ledger</p>
          </div>
        </div>
      )}

      {selectedPatient && loading && (
        <div className="empty-state"><p>Loading ledger...</p></div>
      )}

      {selectedPatient && !loading && ledger && (
        <>
          {/* Patient info header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--teal-800)', flexShrink: 0 }}>
                {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--teal-900)' }}>{selectedPatient.first_name} {selectedPatient.last_name}</div>
                <div style={{ fontSize: 13, color: 'var(--slate-light)', marginTop: 3 }}>
                  {selectedPatient.patient_id} &nbsp;·&nbsp; {selectedPatient.phone || 'No phone'}
                  {selectedPatient.diagnosis && <> &nbsp;·&nbsp; {selectedPatient.diagnosis}</>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 28 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-light)', textTransform: 'uppercase', fontWeight: 500 }}>Total Visits</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--teal-900)' }}>{ledger.summary.total_visits}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-light)', textTransform: 'uppercase', fontWeight: 500 }}>Total Charged</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--slate)' }}>{fmt(ledger.summary.total_charged)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-light)', textTransform: 'uppercase', fontWeight: 500 }}>Total Paid</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{fmt(ledger.summary.total_paid)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-light)', textTransform: 'uppercase', fontWeight: 500 }}>Balance Due</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: Number(ledger.summary.balance_due) > 0 ? 'var(--coral)' : 'var(--green)' }}>
                    {fmt(ledger.summary.balance_due)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div className="tabs" style={{ marginBottom: 0 }}>
              <button className={`tab ${tab === 'visits' ? 'active' : ''}`} onClick={() => setTab('visits')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={13} />Visit History ({ledger.visits.length})</span>
              </button>
              <button className={`tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CreditCard size={13} />Payments ({ledger.payments.length})</span>
              </button>
            </div>
            <button className="btn btn-secondary" onClick={handleExport}>
              <Download size={15} />Export {tab === 'visits' ? 'Visits' : 'Payments'}
            </button>
          </div>

          {exportError && <div className="alert alert-error" style={{ marginTop: 4 }}>{exportError}</div>}

          {tab === 'visits' && (
            <div className="card">
              {ledger.visits.length === 0 ? (
                <div className="empty-state"><p>No visits recorded for this patient.</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Therapy Type</th>
                        <th>Therapist</th>
                        <th>Duration</th>
                        <th>Fee</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.visits.map((v, i) => {
                        const bal = Number(v.fee_charged) - Number(v.amount_paid);
                        return (
                          <tr key={v.id}>
                            <td data-label="#" style={{ color: 'var(--slate-light)', fontSize: 12 }}>{i + 1}</td>
                            <td data-label="Date" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayDate(v.visit_date)}</td>
                            <td data-label="Time" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{displayTime(v.visit_time)}</td>
                            <td data-label="Therapy Type" style={{ fontSize: 12.5 }}>
                              {getTherapyRows(v).length
                                ? getTherapyRows(v).map((t, i) => (
                                    <div key={i}>{t.therapy_type} <span style={{ color: 'var(--slate-light)' }}>({t.duration_minutes}m)</span></div>
                                  ))
                                : '—'}
                            </td>
                            <td data-label="Therapist" style={{ fontSize: 13, color: 'var(--slate)' }}>{v.therapist_name || '—'}</td>
                            <td data-label="Duration">{v.duration_minutes} min</td>
                            <td data-label="Fee" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v.fee_charged)}</td>
                            <td data-label="Paid" className="amount-income">{fmt(v.amount_paid)}</td>
                            <td data-label="Balance" className={bal > 0 ? 'amount-expense' : 'amount-income'}>{fmt(bal)}</td>
                            <td data-label="Method"><span className={`badge badge-${v.payment_method}`}>{v.payment_method}</span></td>
                            <td data-label="Status"><span className={`badge badge-${v.payment_status}`}>{v.payment_status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="card">
              {ledger.payments.length === 0 ? (
                <div className="empty-state"><p>No payment records for this patient.</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Payment Date</th>
                        <th>Created Date</th>
                        <th>Time</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Reference</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.payments.map((p, i) => (
                        <tr key={p.id}>
                          <td data-label="#" style={{ color: 'var(--slate-light)', fontSize: 12 }}>{i + 1}</td>
                          <td data-label="Payment Date" style={{ fontVariantNumeric: 'tabular-nums' }}>{displayDate(p.payment_date)}</td>
                          <td data-label="Created Date" style={{ fontVariantNumeric: 'tabular-nums' }}>{displayDate(p.created_at)}</td>
                          <td data-label="Time" style={{ fontVariantNumeric: 'tabular-nums' }}>{displayTime(p.created_at)}</td>
                          <td data-label="Amount" className="amount-income">{fmt(p.amount)}</td>
                          <td data-label="Method"><span className={`badge badge-${p.payment_method}`}>{p.payment_method}</span></td>
                          <td data-label="Reference" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{p.reference_number || '—'}</td>
                          <td data-label="Notes" style={{ fontSize: 12.5, color: 'var(--slate)' }}>{p.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
