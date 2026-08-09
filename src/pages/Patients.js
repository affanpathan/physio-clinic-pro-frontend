import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Edit2, Activity, Eye } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const EMPTY_PATIENT = {
  first_name: '', last_name: '', phone: '', email: '',
  date_of_birth: '', age: '', gender: '', address: '', diagnosis: '',
  referring_doctor: '', notes: '', is_active: true,
};

export default function Patients({ navigate, setSelectedPatient }) {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editPatient, setEditPatient] = useState(null);
  const [form, setForm] = useState(EMPTY_PATIENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(r => r.json())
      .then(d => { setPatients(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setForm(EMPTY_PATIENT); setEditPatient(null); setError(''); setShowModal(true); };
  const openEdit = (p) => {
    setForm({ ...p, date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '' });
    setEditPatient(p);
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.first_name || !form.last_name) { setError('First and last name are required.'); return; }
    setSaving(true); setError('');
    try {
      const url = editPatient ? `${API_URL}/patients/${editPatient.id}` : `${API_URL}/patients`;
      const method = editPatient ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setShowModal(false);
      load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const viewLedger = (p) => { setSelectedPatient(p); navigate('patient-ledger', p); };

  useEscapeKey(showModal, () => setShowModal(false));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patients</h1>
        <p className="page-subtitle">Manage patient records and information</p>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input placeholder="Search by name, ID, or phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} />Add Patient</button>
      </div>

      <div className="card">
        {loading && <div className="empty-state"><p>Loading patients...</p></div>}
        {!loading && patients.length === 0 && (
          <div className="empty-state"><p>No patients found. Add your first patient.</p></div>
        )}
        {!loading && patients.length > 0 && (
          <div>
            {patients.map(p => (
              <div key={p.id} className="patient-card">
                <div className="patient-avatar">{p.first_name[0]}{p.last_name[0]}</div>
                <div className="patient-info">
                  <div className="patient-name">{p.first_name} {p.last_name}</div>
                  <div className="patient-meta">
                    {p.patient_id} &nbsp;·&nbsp; {p.phone || 'No phone'} 
                    {p.diagnosis && <> &nbsp;·&nbsp; {p.diagnosis.slice(0,40)}{p.diagnosis.length > 40 ? '…' : ''}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${p.is_active ? 'active' : 'inactive'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button className="btn btn-ghost btn-sm btn-icon" title="View Ledger" onClick={() => viewLedger(p)}>
                    <Activity size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => openEdit(p)}>
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <span className="modal-title">{editPatient ? 'Edit Patient' : 'New Patient'}</span>
              <button className="btn btn-sm btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Personal Information</div>
              <div className="form-grid form-grid-3" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-input" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input type="number" min="0" max="120" className="form-input" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Address</label>
                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="form-section">
                <div className="form-section-title">Clinical Information</div>
                <div className="form-grid form-grid-2" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Diagnosis / Condition</label>
                    <input className="form-input" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Referring Doctor</label>
                    <input className="form-input" value={form.referring_doctor} onChange={e => setForm({ ...form, referring_doctor: e.target.value })} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
                {editPatient && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
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
                {saving ? 'Saving...' : (editPatient ? 'Update Patient' : 'Add Patient')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
