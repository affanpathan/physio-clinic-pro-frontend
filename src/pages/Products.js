import React, { useEffect, useState } from 'react';
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
  product_name: '',
  description: '',
  price: '',
  is_active: true,
};

export default function Products({ clinicId }) {
  const { symbol } = useCurrency();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch products.');
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
      if (!form.product_name.trim()) {
        throw new Error('Product name is required.');
      }
      const payload = {
        ...form,
        clinic_id: clinicId || null,
        price: Number(form.price) || 0,
        is_active: Boolean(form.is_active),
      };
      const url = editingId ? `${API_URL}/products/${editingId}` : `${API_URL}/products`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessage(editingId ? 'Product updated successfully' : 'Product created successfully');
      resetForm();
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      product_name: item.product_name || '',
      description: item.description || '',
      price: item.price ?? '',
      is_active: item.is_active !== false,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setMessage('Product deleted successfully');
      fetchItems();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Products</h2>
      <p style={{ color: '#666' }}>Manage the product catalog used when recording Product Sale income.</p>

      {message && <div style={{ marginBottom: 16, color: '#0b6e4f' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <input name="product_name" placeholder="Product Name" required value={form.product_name} onChange={handleChange} style={inputStyle} />
          <input name="price" type="number" step="0.01" placeholder={`Price (${symbol})`} value={form.price} onChange={handleChange} style={inputStyle} />
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} style={{ ...inputStyle, minHeight: 42 }} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input type="checkbox" name="is_active" checked={Boolean(form.is_active)} onChange={handleChange} />
          Active
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" style={buttonStyle}>{editingId ? 'Update Product' : 'Create Product'}</button>
          {editingId ? <button type="button" onClick={resetForm} style={secondaryButtonStyle}>Cancel</button> : null}
        </div>
      </form>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <h3>Product Records</h3>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Clinic</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.clinic_name || item.clinic_id}</td>
                  <td style={tdStyle}>{item.product_name}</td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>{symbol}{Number(item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={tdStyle}>{item.is_active ? 'Yes' : 'No'}</td>
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
