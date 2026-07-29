import React, { useEffect, useState } from 'react';

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
  clinic_id: '',
  user_name: '',
  user_id: '',
  user_pass: '',
  active: true,
};

export default function ClinicUsers() {
  const [items, setItems] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchClinics = async () => {
    try {
      const res = await fetch(`${API_URL}/clinic-master`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch clinics.');
      }
      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from server.');
      }
      setClinics(data);
    } catch (err) {
      setClinics([]);
      setMessage(err.message);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clinic-users`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch clinic users.');
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
    fetchClinics();
    fetchItems();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
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
        clinic_id: form.clinic_id ? Number(form.clinic_id) : null,
        active: Boolean(form.active),
      };
      const url = editingId ? `${API_URL}/clinic-users/${editingId}` : `${API_URL}/clinic-users`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessage(editingId ? 'Clinic user updated successfully' : 'Clinic user created successfully');
      resetForm();
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      clinic_id: item.clinic_id ? String(item.clinic_id) : '',
      user_name: item.user_name || '',
      user_id: item.user_id || '',
      user_pass: item.user_pass || '',
      active: item.active !== false,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this clinic user record?')) return;
    try {
      const res = await fetch(`${API_URL}/clinic-users/${id}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setMessage('Clinic user deleted successfully');
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Clinic Users</h2>
      <p style={{ color: '#666' }}>Manage clinic user accounts directly from this page.</p>

      {message && <div style={{ marginBottom: 16, color: '#0b6e4f' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <select name="clinic_id" required value={form.clinic_id} onChange={handleChange} style={inputStyle}>
            <option value="">Select Clinic</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.clinic_name}
              </option>
            ))}
          </select>
          <input name="user_name" placeholder="User Name" required value={form.user_name} onChange={handleChange} style={inputStyle} />
          <input name="user_id" placeholder="User ID" required value={form.user_id} onChange={handleChange} style={inputStyle} />
          <input name="user_pass" type="password" placeholder="Password" required value={form.user_pass} onChange={handleChange} style={inputStyle} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" name="active" checked={Boolean(form.active)} onChange={handleChange} />
          Active
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" style={buttonStyle}>{editingId ? 'Update User' : 'Create User'}</button>
          {editingId ? <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Cancel</button> : null}
        </div>
      </form>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <h3>Clinic Users</h3>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Clinic</th>
                <th style={thStyle}>User Name</th>
                <th style={thStyle}>User ID</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.clinic_name || item.clinic_id}</td>
                  <td style={tdStyle}>{item.user_name}</td>
                  <td style={tdStyle}>{item.user_id}</td>
                  <td style={tdStyle}>{item.active ? 'Yes' : 'No'}</td>
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
