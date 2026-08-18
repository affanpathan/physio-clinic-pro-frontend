import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCsvExport } from '../utils/exportCsv';
import { useCurrency } from '../context/CurrencyContext';

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
  bank_name: '',
  active: true,
};

export default function Banks({ clinicId }) {
  const { symbol } = useCurrency();
  const fmt = (n) => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/banks?with_balance=true`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch banks.');
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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (!form.bank_name.trim()) {
        throw new Error('Bank name is required.');
      }
      const payload = {
        ...form,
        clinic_id: clinicId || null,
        active: Boolean(form.active),
      };
      const url = editingId ? `${API_URL}/banks/${editingId}` : `${API_URL}/banks`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessage(editingId ? 'Bank updated successfully' : 'Bank created successfully');
      resetForm();
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      bank_name: item.bank_name || '',
      active: item.active !== false,
    });
  };

  const handleExport = async () => {
    setMessage('');
    try {
      await downloadCsvExport(`${API_URL}/banks/export`, 'banks_export.csv');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bank record?')) return;
    try {
      const res = await fetch(`${API_URL}/banks/${id}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setMessage('Bank deleted successfully');
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Banks</h2>
      <p style={{ color: '#666' }}>Manage bank accounts used to receive online payments.</p>

      {message && <div style={{ marginBottom: 16, color: '#0b6e4f' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <input name="bank_name" placeholder="Bank Name" required value={form.bank_name} onChange={handleChange} style={inputStyle} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" name="active" checked={Boolean(form.active)} onChange={handleChange} />
          Active
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" style={buttonStyle}>{editingId ? 'Update Bank' : 'Create Bank'}</button>
          {editingId ? <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Cancel</button> : null}
        </div>
      </form>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Bank Records</h3>
          <button className="btn btn-secondary" onClick={handleExport}><Download size={15} />Export</button>
        </div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Clinic</th>
                <th style={thStyle}>Bank Name</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Balance</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.clinic_name || item.clinic_id}</td>
                  <td style={tdStyle}>{item.bank_name}</td>
                  <td style={tdStyle}>{item.active ? 'Yes' : 'No'}</td>
                  <td style={tdStyle}>{fmt(item.balance)}</td>
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
