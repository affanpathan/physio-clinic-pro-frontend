import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Download } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { downloadCsvExport } from '../utils/exportCsv';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const fmtDate = value => {
  if (!value) return '—';
  if (typeof value === 'string') return value.includes('T') ? value.split('T')[0] : value;
  try { return value.toISOString().slice(0, 10); } catch { return String(value); }
};

export default function PatientDues() {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [patSearch, setPatSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerPatient, setLedgerPatient] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  const loadDues = useCallback(() => {
    setLoading(true);
    let url = `${API_URL}/patient-dues`;
    if (selectedPatient?.id) url += `?patient_id=${selectedPatient.id}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { setDues(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setDues([]); setLoading(false); });
  }, [selectedPatient]);

  useEffect(() => { loadDues(); }, [loadDues]);

  useEffect(() => {
    if (patSearch.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(patSearch)}`)
        .then(r => r.json()).then(setPatients)
        .catch(() => setPatients([]));
    } else {
      setPatients([]);
    }
  }, [patSearch]);

  const selectPatient = (p) => {
    setSelectedPatient(p);
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatSearch('');
    setPatients([]);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patients, selectPatient, () => setPatients([]));

  const handleExport = async () => {
    setExportError('');
    try {
      const qs = selectedPatient?.id ? `?patient_id=${selectedPatient.id}` : '';
      await downloadCsvExport(`${API_URL}/patient-dues/export${qs}`, 'patient-dues_export.csv');
    } catch (e) { setExportError(e.message); }
  };

  const openLedgerModal = (patient) => {
    setLedgerPatient(patient);
    setLedgerModalOpen(true);
    setLedgerData(null);
    setLedgerLoading(true);
    fetch(`${API_URL}/patient-ledger/${patient.id}`)
      .then(r => r.json())
      .then(data => { setLedgerData(data); setLedgerLoading(false); })
      .catch(() => { setLedgerLoading(false); });
  };

  const closeLedgerModal = () => {
    setLedgerModalOpen(false);
    setLedgerPatient(null);
    setLedgerData(null);
    setLedgerLoading(false);
  };

  useEscapeKey(ledgerModalOpen, closeLedgerModal);

  // A negative due_balance means the patient has paid ahead — that overpayment is advance credit.
  const owing = dues.filter(row => Number(row.due_balance || 0) > 0);
  const advances = dues.filter(row => Number(row.due_balance || 0) < 0);
  const totalDue = owing.reduce((sum, row) => sum + Number(row.due_balance || 0), 0);
  const totalAdvance = advances.reduce((sum, row) => sum - Number(row.due_balance || 0), 0);

  const balanceTable = (rows, balanceLabel, balanceValue, balanceClass) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Patient ID</th>
            <th>Total Charged</th>
            <th>Total Paid</th>
            <th>{balanceLabel}</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td data-label="Patient">{row.first_name} {row.last_name}</td>
              <td data-label="Patient ID" style={{ fontVariantNumeric: 'tabular-nums' }}>{row.patient_code}</td>
              <td data-label="Total Charged" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.total_charged)}</td>
              <td data-label="Total Paid" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(row.total_paid)}</td>
              <td data-label={balanceLabel} className={balanceClass} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(balanceValue(row))}</td>
              <td data-label="Action">
                <button className="btn btn-sm btn-secondary" onClick={() => openLedgerModal(row)}>
                  View Ledger
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patient Dues</h1>
        <p className="page-subtitle">View per-patient outstanding balances and advance credit from visit charges</p>
      </div>

      <div className="toolbar" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              placeholder="Search patient by name..."
              value={patSearch}
              onChange={e => { setPatSearch(e.target.value); if (!e.target.value) clearPatient(); }}
              onKeyDown={onPatSearchKeyDown}
              style={{ paddingRight: 36 }}
            />
            {patSearch && (
              <button onClick={clearPatient} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-light)' }}>
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
                  <div style={{ fontSize: 12, color: 'var(--slate-light)' }}>{p.patient_id} · {p.phone || 'No phone'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleExport}><Download size={15} />Export</button>
      </div>

      {exportError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{exportError}</div>}

      <div className="ledger-summary">
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Patients with Due</span>
          <span className="ledger-summary-value" style={{ color: 'var(--teal-900)' }}>{owing.length}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Total Due</span>
          <span className="ledger-summary-value" style={{ color: 'var(--coral)' }}>{fmt(totalDue)}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Patients in Advance</span>
          <span className="ledger-summary-value" style={{ color: 'var(--teal-900)' }}>{advances.length}</span>
        </div>
        <div className="ledger-summary-item">
          <span className="ledger-summary-label">Total Advance</span>
          <span className="ledger-summary-value" style={{ color: 'var(--green)' }}>{fmt(totalAdvance)}</span>
        </div>
        {selectedPatient && (
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Filtered Patient</span>
            <span className="ledger-summary-value" style={{ color: 'var(--teal-900)' }}>{selectedPatient.first_name} {selectedPatient.last_name}</span>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading patient dues...</p></div>
        ) : owing.length === 0 ? (
          <div className="empty-state"><p>{selectedPatient ? 'No due amount found for this patient.' : 'No patient dues found.'}</p></div>
        ) : (
          balanceTable(owing, 'Due Balance', row => row.due_balance, 'amount-expense')
        )}
      </div>

      {!loading && advances.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="form-section-title" style={{ padding: '14px 16px 0' }}>In Advance</div>
          {balanceTable(advances, 'Advance Balance', row => -Number(row.due_balance || 0), 'amount-income')}
        </div>
      )}

      {ledgerModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">Patient Ledger - {ledgerPatient?.first_name} {ledgerPatient?.last_name}</span>
              <button className="btn btn-sm btn-icon" onClick={closeLedgerModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {ledgerLoading ? (
                <div className="empty-state"><p>Loading ledger details...</p></div>
              ) : ledgerData ? (
                <>
                  <div className="form-grid form-grid-2" style={{ marginBottom: 20 }}>
                    <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Total Visit History</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--teal-900)' }}>{ledgerData.summary?.total_visits ?? 0}</div>
                    </div>
                    <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Total Payments</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{fmt(ledgerData.summary?.total_paid ?? 0)}</div>
                    </div>
                    <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Total Charged</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--slate)' }}>{fmt(ledgerData.summary?.total_charged ?? 0)}</div>
                    </div>
                    <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Balance Due</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: Number(ledgerData.summary?.balance_due) > 0 ? 'var(--coral)' : 'var(--green)' }}>
                        {fmt(ledgerData.summary?.balance_due ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 240, padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Visit Records</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{ledgerData.visits.length}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--slate)' }}>{ledgerData.visits.length} visit{ledgerData.visits.length === 1 ? '' : 's'} found</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 240, padding: 14, border: '1px solid var(--border)', borderRadius: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 8 }}>Payment Records</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{ledgerData.payments.length}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--slate)' }}>{ledgerData.payments.length} payment{ledgerData.payments.length === 1 ? '' : 's'} found</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state"><p>Unable to load ledger details.</p></div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeLedgerModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
