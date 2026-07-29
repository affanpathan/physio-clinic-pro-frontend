import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const THERAPY_TYPES = ['Manual Therapy', 'Exercise Therapy', 'Electrotherapy', 'Ultrasound', 'TENS', 'Heat Therapy', 'Cold Therapy', 'Dry Needling', 'Cupping', 'Hydrotherapy', 'Taping', 'Post-surgical Rehab', 'Sports Rehab', 'Other'];

const EMPTY_VISIT = {
  patient_id: '', therapy_plan_id: '', visit_date: new Date().toISOString().split('T')[0],
  visit_time: '09:00', therapist_name: '', therapy_type: '', duration_minutes: 60,
  fee_charged: '', amount_paid: '', payment_method: 'cash', payment_status: 'paid',
  session_notes: '', chief_complaint: '', treatment_given: '',
};

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Visits() {
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editVisit, setEditVisit] = useState(null);
  const [form, setForm] = useState(EMPTY_VISIT);
  const [patSearch, setPatSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  const shiftDate = (days) => {
    const d = new Date(date); d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const openAdd = () => { setForm({ ...EMPTY_VISIT, visit_date: date }); setEditVisit(null); setError(''); setPatSearch(''); setShowModal(true); };
  const openEdit = (v) => {
    setForm({ ...v, visit_date: v.visit_date?.split('T')[0] || date });
    setEditVisit(v);
    setPatSearch(`${v.first_name} ${v.last_name}`);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_id) { setError('Please select a patient.'); return; }
    if (!form.visit_date) { setError('Visit date is required.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        payment_status: computePaymentStatus(form.fee_charged, form.amount_paid),
      };
      const url = editVisit ? `${API_URL}/visits/${editVisit.id}` : `${API_URL}/visits`;
      const method = editVisit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowModal(false); loadVisits();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const selectPatient = (p) => {
    setForm(f => ({ ...f, patient_id: p.id }));
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
  };

  const safeVisits = Array.isArray(visits) ? visits : [];
  const totalIncome = safeVisits.reduce((s, v) => s + Number(v.amount_paid || 0), 0);
  const totalCharged = safeVisits.reduce((s, v) => s + Number(v.fee_charged || 0), 0);

  const computePaymentStatus = (fee, paid) => {
    const feeValue = Number(fee || 0);
    const paidValue = Number(paid || 0);
    if (feeValue > 0 && paidValue >= feeValue) return 'paid';
    if (paidValue > 0) return 'partial';
    return 'pending';
  };

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
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} />Record Visit</button>
      </div>

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
                  <th>Duration</th>
                  <th>Fee</th>
                  <th>Paid</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visits.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--teal-900)', fontSize: 13.5 }}>{v.first_name} {v.last_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--slate-light)' }}>{v.pid}</div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{v.visit_date?.split('T')[0]}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{v.visit_time?.slice(0,5) || '—'}</td>
                    <td>{v.therapy_type || '—'}</td>
                    <td>{v.duration_minutes} min</td>
                    <td className="amount-expense">{fmt(v.fee_charged)}</td>
                    <td className="amount-income">{fmt(v.amount_paid)}</td>
                    <td><span className={`badge badge-${v.payment_method}`}>{v.payment_method}</span></td>
                    <td><span className={`badge badge-${v.payment_status}`}>{v.payment_status}</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(v)} title="Edit">
                        <Edit2 size={13} />
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
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
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
                    onChange={e => { setPatSearch(e.target.value); setForm(f => ({ ...f, patient_id: '' })); }}
                    disabled={!!editVisit}
                  />
                  {patients.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, zIndex: 20, boxShadow: 'var(--shadow-md)', marginTop: 2, maxHeight: 180, overflowY: 'auto' }}>
                      {patients.map(p => (
                        <div key={p.id} onClick={() => selectPatient(p)} style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13.5 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--teal-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
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
                  <input className="form-input" value={form.therapist_name} onChange={e => setForm({ ...form, therapist_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Therapy Type</label>
                  <select className="form-select" value={form.therapy_type} onChange={e => setForm({ ...form, therapy_type: e.target.value })}>
                    <option value="">Select type</option>
                    {THERAPY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (minutes)</label>
                  <input type="number" className="form-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
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
                    <label className="form-label">Fee Charged (₹)</label>
                    <input type="number" className="form-input" value={form.fee_charged} onChange={e => setForm({ ...form, fee_charged: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount Paid (₹)</label>
                    <input type="number" className="form-input" value={form.amount_paid} onChange={e => setForm({ ...form, amount_paid: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                      <option value="cash">Cash</option>
                      <option value="online">Online / UPI</option>
                    </select>
                  </div>
                </div>
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
