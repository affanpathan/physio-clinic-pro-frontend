import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Edit2, Trash2, Download } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { getTherapyRows } from '../utils/therapy';
import { downloadCsvExport } from '../utils/exportCsv';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const THERAPY_TYPES = ['Bio Lite','Premium Plus','Manual Therapy', 'Exercise Therapy', 'Electrotherapy', 'Ultrasound', 'TENS', 'Heat Therapy', 'Cold Therapy', 'Dry Needling', 'Cupping', 'Hydrotherapy', 'Taping', 'Post-surgical Rehab', 'Sports Rehab', 'Other'];

const EMPTY_VISIT = {
  patient_id: '', therapy_plan_id: '', visit_date: new Date().toISOString().split('T')[0],
  visit_time: '09:00', therapist_name: '', therapies: [{ therapy_type: '', duration_minutes: 15 }],
  fee_charged: '', amount_paid: '', payment_method: 'cash', bank_id: '', payment_status: 'paid',
  session_notes: '', chief_complaint: '', treatment_given: '',
};


export default function Visits() {
  const { symbol } = useCurrency();
  const fmt = n => symbol + Number(n || 0).toLocaleString('en-IN');
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [banks, setBanks] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVisit, setEditVisit] = useState(null);
  const [paymentLocked, setPaymentLocked] = useState(false);
  const [form, setForm] = useState(EMPTY_VISIT);
  const [patSearch, setPatSearch] = useState('');
  const [priorBalance, setPriorBalance] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [viewMode, setViewMode] = useState('day'); // day | all

  const loadVisits = useCallback(() => {
    setLoading(true);
    const params = viewMode === 'day' ? `?date=${date}` : '';
    fetch(`${API_URL}/visits${params}`)
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          console.warn('Failed to load visits', data);
          return [];
        }
        return Array.isArray(data) ? data : [];
      })
      .then((d) => { setVisits(d); setLoading(false); })
      .catch((err) => {
        console.error('Visit load error', err);
        setVisits([]);
        setLoading(false);
      });
  }, [date, viewMode]);

  useEffect(() => { loadVisits(); }, [loadVisits]);

  useEffect(() => {
    if (patSearch.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(patSearch)}`)
        .then(r => r.json()).then(setPatients);
    } else { setPatients([]); }
  }, [patSearch]);

  useEffect(() => {
    fetch(`${API_URL}/therapists`)
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        setTherapists(Array.isArray(data) ? data : []);
      })
      .catch(() => setTherapists([]));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/banks?active=true`)
      .then(async (r) => {
        const data = await r.json().catch(() => []);
        setBanks(Array.isArray(data) ? data : []);
      })
      .catch(() => setBanks([]));
  }, []);

  const shiftDate = (days) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const handleExport = async () => {
    setExportError('');
    try {
      const qs = viewMode === 'day' ? `?date=${date}` : '';
      await downloadCsvExport(`${API_URL}/visits/export${qs}`, 'visits_export.csv');
    } catch (e) { setExportError(e.message); }
  };

  // Balance the patient carries into this visit: positive = dues, negative = advance credit.
  // excludeVisitId keeps the visit being edited out of its own balance.
  const loadPriorBalance = useCallback(async (patientId, excludeVisitId) => {
    setPriorBalance(null);
    if (!patientId) return;
    try {
      const qs = excludeVisitId ? `?exclude_visit_id=${excludeVisitId}` : '';
      const res = await fetch(`${API_URL}/patient-balance/${patientId}${qs}`);
      if (!res.ok) return;
      setPriorBalance(await res.json());
    } catch (err) { /* balance is informational — never block the form */ }
  }, []);

  const openAdd = () => { setForm({ ...EMPTY_VISIT, visit_date: date, therapies: [{ therapy_type: '', duration_minutes: 15 }] }); setEditVisit(null); setPaymentLocked(false); setError(''); setPatSearch(''); setPriorBalance(null); setShowModal(true); };
  const openEdit = (v) => {
    const therapies = getTherapyRows(v);
    const visitDate = v.visit_date?.split('T')[0] || date;
    setForm({ ...v, visit_date: visitDate, therapies: therapies.length ? therapies : [{ therapy_type: '', duration_minutes: 15 }] });
    setEditVisit(v);
    setPaymentLocked(visitDate !== new Date().toISOString().split('T')[0]);
    setPatSearch(`${v.first_name} ${v.last_name}`);
    setError('');
    loadPriorBalance(v.patient_id, v.id);
    setShowModal(true);
  };

  const addTherapyRow = () => setForm(f => ({ ...f, therapies: [...f.therapies, { therapy_type: '', duration_minutes: 15 }] }));
  const removeTherapyRow = (idx) => setForm(f => ({ ...f, therapies: f.therapies.length > 1 ? f.therapies.filter((_, i) => i !== idx) : f.therapies }));
  const updateTherapyRow = (idx, patch) => setForm(f => ({ ...f, therapies: f.therapies.map((r, i) => i === idx ? { ...r, ...patch } : r) }));
  const totalDuration = (form.therapies || []).reduce((s, t) => s + (Number(t.duration_minutes) || 0), 0);

  const handleSave = async () => {
    if (!form.patient_id) { setError('Please select a patient.'); return; }
    if (!form.visit_date) { setError('Visit date is required.'); return; }
    const validTherapies = (form.therapies || []).filter(t => t.therapy_type && Number(t.duration_minutes) > 0);
    if (!validTherapies.length) { setError('Add at least one therapy type with a duration greater than 0.'); return; }
    const seenTypes = new Set();
    for (const t of validTherapies) {
      if (seenTypes.has(t.therapy_type)) { setError(`"${t.therapy_type}" is selected more than once.`); return; }
      seenTypes.add(t.therapy_type);
    }
    if (!form.fee_charged || Number(form.fee_charged) <= 0) { setError('Fee charged is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        therapies: validTherapies,
        // Sent for compatibility only — the server recomputes it from the patient's balance.
        payment_status: computePaymentStatus(form.fee_charged, form.amount_paid, advanceCredit),
      };
      const url = editVisit ? `${API_URL}/visits/${editVisit.id}` : `${API_URL}/visits`;
      const method = editVisit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowModal(false); loadVisits();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const handleDelete = async (v) => {
    if (!window.confirm('Delete this visit? This will also remove its related payment and daily ledger entry.')) return;
    try {
      const res = await fetch(`${API_URL}/visits/${v.id}`, { method: 'DELETE' });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Delete failed'); }
      loadVisits();
    } catch (e) { window.alert(e.message); }
  };

  const selectPatient = (p) => {
    setForm(f => ({ ...f, patient_id: p.id }));
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
    loadPriorBalance(p.id, null);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patients, selectPatient, () => setPatients([]));

  useEscapeKey(showModal, () => setShowModal(false));

  const safeVisits = Array.isArray(visits) ? visits : [];
  const totalIncome = safeVisits.reduce((s, v) => s + Number(v.amount_paid || 0), 0);
  const totalCharged = safeVisits.reduce((s, v) => s + Number(v.fee_charged || 0), 0);

  // Mirrors resolvePaymentStatus in backend/index.js — the server is authoritative, this only
  // previews the badge before saving. An advance already on file marks the visit paid.
  const computePaymentStatus = (fee, paid, credit) => {
    const feeValue = Number(fee || 0);
    const paidValue = Number(paid || 0);
    if (Number(credit || 0) > 0) return 'paid';
    if (feeValue > 0 && paidValue >= feeValue) return 'paid';
    if (paidValue > 0) return 'partial';
    return 'pending';
  };

  const advanceCredit = Number(priorBalance?.advance_credit || 0);
  const outstandingDue = Number(priorBalance?.due_amount || 0);
  // Balance this visit leaves behind: credit carried forward, or the amount still owed.
  const balanceAfterVisit = advanceCredit - Number(form.fee_charged || 0) + Number(form.amount_paid || 0);
  const creditAfterVisit = Math.max(0, balanceAfterVisit);
  const shortfallAfterVisit = Math.max(0, -balanceAfterVisit);
  const previewStatus = computePaymentStatus(form.fee_charged, form.amount_paid, advanceCredit);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Visits</h1>
        <p className="page-subtitle">Record and manage patient therapy sessions</p>
      </div>

      <div className="toolbar">
        <div className="tabs" style={{ marginBottom: 0 }}>
          <button className={`tab ${viewMode === 'day' ? 'active' : ''}`} onClick={() => setViewMode('day')}>Day View</button>
          <button className={`tab ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>All Visits</button>
        </div>
        {viewMode === 'day' && (
          <div className="date-nav">
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftDate(-1)}><ChevronLeft size={16} /></button>
            <input type="date" className="form-input" style={{ width: 'auto' }} value={date} onChange={e => setDate(e.target.value)} />
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftDate(1)}><ChevronRight size={16} /></button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={handleExport}><Download size={15} />Export</button>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} />Record Visit</button>
      </div>

      {exportError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{exportError}</div>}

      {visits.length > 0 && (
        <div className="ledger-summary">
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Visits</span>
            <span className="ledger-summary-value" style={{ color: 'var(--teal-800)' }}>{visits.length}</span>
          </div>
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Total Charged</span>
            <span className="ledger-summary-value" style={{ color: 'var(--slate)' }}>{fmt(totalCharged)}</span>
          </div>
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Collected</span>
            <span className="ledger-summary-value" style={{ color: 'var(--green)' }}>{fmt(totalIncome)}</span>
          </div>
          <div className="ledger-summary-item">
            <span className="ledger-summary-label">Pending</span>
            <span className="ledger-summary-value" style={{ color: 'var(--coral)' }}>{fmt(totalCharged - totalIncome)}</span>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading visits...</p></div>
        ) : visits.length === 0 ? (
          <div className="empty-state">
            <p>No visits recorded{viewMode === 'day' ? ' for this date' : ''}. Click "Record Visit" to add one.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Therapy</th>
                  <th>Total Duration</th>
                  <th>Fee</th>
                  <th>Paid</th>
                  <th>Payment</th>
                  <th>Bank</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id}>
                    <td data-label="Patient">
                      <div style={{ fontWeight: 600, color: 'var(--teal-900)', fontSize: 13.5 }}>{v.first_name} {v.last_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate-light)' }}>{v.pid}</div>
                    </td>
                    <td data-label="Date" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.visit_date?.split('T')[0]}</td>
                    <td data-label="Time" style={{ fontVariantNumeric: 'tabular-nums' }}>{v.visit_time?.slice(0,5) || '—'}</td>
                    <td data-label="Therapy">
                      {getTherapyRows(v).length
                        ? getTherapyRows(v).map((t, i) => (
                            <div key={i} style={{ fontSize: 12.5 }}>{t.therapy_type} <span style={{ color: 'var(--slate-light)' }}>({t.duration_minutes}m)</span></div>
                          ))
                        : '—'}
                    </td>
                    <td data-label="Total Duration">{v.duration_minutes} min</td>
                    <td data-label="Fee" className="amount-expense">{fmt(v.fee_charged)}</td>
                    <td data-label="Paid" className="amount-income">{fmt(v.amount_paid)}</td>
                    <td data-label="Payment"><span className={`badge badge-${v.payment_method}`}>{v.payment_method}</span></td>
                    <td data-label="Bank" style={{ fontSize: 12.5, color: 'var(--slate-light)' }}>{v.bank_name || '—'}</td>
                    <td data-label="Status"><span className={`badge badge-${v.payment_status}`}>{v.payment_status}</span></td>
                    <td data-label="Actions">
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(v)} title="Edit">
                        <Edit2 size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(v)} title="Delete">
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
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editVisit ? 'Edit Visit' : 'Record Visit'}</span>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">

              <div className="form-section-title">Patient & Session</div>
              <div className="form-grid form-grid-2" style={{ marginBottom: 16, position: 'relative' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Patient *</label>
                  <input
                    className="form-input"
                    placeholder="Search patient by name..."
                    value={patSearch}
                    onChange={e => { setPatSearch(e.target.value); setForm(f => ({ ...f, patient_id: '' })); setPriorBalance(null); }}
                    onKeyDown={onPatSearchKeyDown}
                    disabled={!!editVisit}
                  />
                  {patients.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, zIndex: 20, boxShadow: 'var(--shadow-md)', marginTop: 2, maxHeight: 180, overflowY: 'auto' }}>
                      {patients.map((p, i) => (
                        <div key={p.id} onClick={() => selectPatient(p)} onMouseEnter={() => setPatHighlight(i)}
                          style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13.5, background: i === patHighlight ? 'var(--teal-50)' : '#fff' }}>
                          <strong>{p.first_name} {p.last_name}</strong> <span style={{ color: 'var(--slate-light)', fontSize: 12 }}>· {p.patient_id} · {p.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Visit Date *</label>
                  <input type="date" className="form-input" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Visit Time</label>
                  <input type="time" className="form-input" value={form.visit_time} onChange={e => setForm({ ...form, visit_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Therapist Name</label>
                  <select className="form-select" value={form.therapist_name} onChange={e => setForm({ ...form, therapist_name: e.target.value })}>
                    <option value="">Select therapist</option>
                    {therapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.therapist_name}>
                        {therapist.therapist_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Therapy & Duration *</label>
                  {form.therapies.map((row, idx) => {
                    const otherSelected = form.therapies.filter((_, i) => i !== idx).map(r => r.therapy_type);
                    return (
                      <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                        <select
                          className="form-select"
                          style={{ flex: 2 }}
                          value={row.therapy_type}
                          onChange={e => updateTherapyRow(idx, { therapy_type: e.target.value })}
                        >
                          <option value="">Select therapy type</option>
                          {THERAPY_TYPES.filter(t => t === row.therapy_type || !otherSelected.includes(t)).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="form-input"
                          style={{ flex: 1 }}
                          placeholder="Minutes"
                          value={row.duration_minutes}
                          onChange={e => updateTherapyRow(idx, { duration_minutes: e.target.value })}
                        />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon"
                          onClick={() => removeTherapyRow(idx)}
                          disabled={form.therapies.length === 1}
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addTherapyRow}>
                    <Plus size={13} /> Add Therapy
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Duration (minutes)</label>
                  <input type="number" className="form-input" value={totalDuration} disabled readOnly />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Clinical Notes</div>
                <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Chief Complaint</label>
                    <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.chief_complaint} onChange={e => setForm({ ...form, chief_complaint: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Treatment Given</label>
                    <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.treatment_given} onChange={e => setForm({ ...form, treatment_given: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Session Notes</label>
                  <textarea className="form-textarea" value={form.session_notes} onChange={e => setForm({ ...form, session_notes: e.target.value })} />
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-title">Payment</div>
                <div className="form-grid form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Fee Charged ({symbol}) *</label>
                    <input type="number" className="form-input" value={form.fee_charged} onChange={e => setForm({ ...form, fee_charged: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid ({symbol})</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.amount_paid}
                      onChange={e => setForm({ ...form, amount_paid: e.target.value })}
                      disabled={paymentLocked}
                      title={paymentLocked ? 'Paid amount can only be edited on the day of the visit' : undefined}
                    />
                  </div>
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
                </div>
                {form.patient_id && (advanceCredit > 0 || outstandingDue > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 13 }}>
                    {advanceCredit > 0 ? (
                      <span className="amount-income">
                        Advance on file: <strong>{fmt(advanceCredit)}</strong>
                        {shortfallAfterVisit > 0
                          ? <> — covers part of this visit. Shortfall: <strong>{fmt(shortfallAfterVisit)}</strong>.</>
                          : <> — this visit is covered. Remaining after this visit: <strong>{fmt(creditAfterVisit)}</strong>.</>}
                      </span>
                    ) : (
                      <span className="amount-expense">
                        Outstanding dues: <strong>{fmt(outstandingDue)}</strong>
                      </span>
                    )}
                    <span className={`badge badge-${previewStatus}`}>{previewStatus}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ alignItems: 'center' }}>
              <div style={{ marginRight: 12 }}>
                {error && <div className="alert alert-error">{error}</div>}
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editVisit ? 'Update Visit' : 'Record Visit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
