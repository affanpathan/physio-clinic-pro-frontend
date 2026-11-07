import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZES = [15, 25, 50, 75, 100];

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
  const [messageIsError, setMessageIsError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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
      setPage(1);
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

  const normalizedSearch = search.trim().toLowerCase();
  const filteredItems = items.filter((item) => (
    [item.product_name, item.description, item.clinic_name, item.clinic_id]
      .some(value => String(value || '').toLowerCase().includes(normalizedSearch))
  ));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = filteredItems.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, filteredItems.length);

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
      setMessageIsError(false);
      resetForm();
      fetchItems();
    } catch (err) {
      setMessage(err.message);
      setMessageIsError(true);
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
      setMessageIsError(false);
      fetchItems();
    } catch (err) {
      setMessage(err.message);
      setMessageIsError(true);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Products</h2>
      <p style={{ color: '#666' }}>Manage the product catalog used when recording Product Sale income.</p>

      {message && <div style={{ marginBottom: 16, color: messageIsError ? '#be123c' : '#0b6e4f' }}>{message}</div>}

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Product Records</h3>
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              className="form-input"
              type="search"
              placeholder="Search products..."
              aria-label="Search products"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>
        {loading ? <div>Loading...</div> : (
          filteredItems.length === 0 ? (
            <div style={{ padding: 20, color: '#64748b' }}>{search ? 'No products match your search.' : 'No products found.'}</div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
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
                    {paginatedItems.map((item) => (
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 4px', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label htmlFor="products-page-size" style={{ fontSize: 13, color: '#666', margin: 0 }}>Rows per page</label>
                  <select
                    id="products-page-size"
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                    style={{ ...inputStyle, width: 'auto', minWidth: 90 }}
                  >
                    {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#666' }}>Showing {rangeStart}–{rangeEnd} of {filteredItems.length}</span>
                  <button type="button" aria-label="Previous page" title="Previous page" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page <= 1} style={secondaryIconButtonStyle}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
                  <button type="button" aria-label="Next page" title="Next page" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page >= totalPages} style={secondaryIconButtonStyle}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )
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

const secondaryIconButtonStyle = {
  width: 34,
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
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
