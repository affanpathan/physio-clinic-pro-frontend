import React, { useEffect, useState } from 'react';
import CURRENCIES from '../data/currencies';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const emptyForm = {
  clinic_name: '',
  clinic_person: '',
  clinic_phone: '',
  clinic_address: '',
  clinic_city: '',
  clinic_state: '',
  clinic_country: '',
  currency: 'INR',
  last_date: '',
  clinic_active: true,
};

export default function ClinicMaster() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clinic-master`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch clinic records.');
      }
      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from server.');
      }
      setItems(data);
    } catch (err) {
      setItems([]);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCountryChange = (e) => {
    const country = e.target.value;
    const match = CURRENCIES.find((c) => c.country === country);
    setForm((prev) => ({
      ...prev,
      clinic_country: country,
      currency: match ? match.code : prev.currency,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...form,
        clinic_active: Boolean(form.clinic_active),
      };
      const url = editingId ? `${API_URL}/clinic-master/${editingId}` : `${API_URL}/clinic-master`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessage(editingId ? 'Clinic updated successfully' : 'Clinic created successfully');
      resetForm();
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      clinic_name: item.clinic_name || '',
      clinic_person: item.clinic_person || '',
      clinic_phone: item.clinic_phone || '',
      clinic_address: item.clinic_address || '',
      clinic_city: item.clinic_city || '',
      clinic_state: item.clinic_state || '',
      clinic_country: item.clinic_country || '',
      currency: item.currency || 'INR',
      last_date: item.last_date ? item.last_date.slice(0, 10) : '',
      clinic_active: item.clinic_active !== false,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this clinic record?')) return;
    try {
      const res = await fetch(`${API_URL}/clinic-master/${id}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setMessage('Clinic deleted successfully');
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Clinic Master</h2>
      <p style={{ color: '#666' }}>Manage clinic records directly from this page.</p>

      {message && <div style={{ marginBottom: 16, color: '#0b6e4f' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <input name="clinic_name" placeholder="Clinic Name" required value={form.clinic_name} onChange={handleChange} style={inputStyle} />
          <input name="clinic_person" placeholder="Person Name" value={form.clinic_person} onChange={handleChange} style={inputStyle} />
          <input name="clinic_phone" placeholder="Phone" value={form.clinic_phone} onChange={handleChange} style={inputStyle} />
          <input name="clinic_city" placeholder="City" value={form.clinic_city} onChange={handleChange} style={inputStyle} />
          <input name="clinic_state" placeholder="State" value={form.clinic_state} onChange={handleChange} style={inputStyle} />
          <select name="clinic_country" value={form.clinic_country} onChange={handleCountryChange} style={inputStyle}>
            <option value="">Select Country</option>
            {CURRENCIES.map(({ country }) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <select name="currency" value={form.currency} onChange={handleChange} style={inputStyle}>
            <option value="">Select Currency</option>
            {CURRENCIES.map(({ country, code, name }) => (
              <option key={country} value={code}>{code} ({name}) — {country}</option>
            ))}
          </select>
          <input name="last_date" type="date" value={form.last_date} onChange={handleChange} style={inputStyle} />
          <textarea name="clinic_address" placeholder="Address" value={form.clinic_address} onChange={handleChange} style={{ ...inputStyle, minHeight: 42 }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" name="clinic_active" checked={Boolean(form.clinic_active)} onChange={handleChange} />
          Active
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" style={buttonStyle}>{editingId ? 'Update Clinic' : 'Create Clinic'}</button>
          {editingId ? <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Cancel</button> : null}
        </div>
      </form>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <h3>Clinic Records</h3>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Person</th>
                <th style={thStyle}>Phone</th>
                <th style={thStyle}>City</th>
                <th style={thStyle}>Currency</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.clinic_name}</td>
                  <td style={tdStyle}>{item.clinic_person}</td>
                  <td style={tdStyle}>{item.clinic_phone}</td>
                  <td style={tdStyle}>{item.clinic_city}</td>
                  <td style={tdStyle}>{item.currency || '-'}</td>
                  <td style={tdStyle}>{item.clinic_active ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleEdit(item)} style={secondaryButtonStyle}>Edit</button>{' '}
                    <button onClick={() => handleDelete(item.id)} style={dangerButtonStyle}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d7de',
  borderRadius: 6,
};

const buttonStyle = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 6,
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  padding: '8px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
};

const dangerButtonStyle = {
  padding: '8px 12px',
  border: '1px solid #fda4af',
  borderRadius: 6,
  background: '#fff1f2',
  color: '#be123c',
  cursor: 'pointer',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle = {
  padding: '10px 8px',
  borderBottom: '1px solid #f3f4f6',
};
