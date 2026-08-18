import React, { useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { downloadCsvExport } from '../utils/exportCsv';
import { useCurrency } from '../context/CurrencyContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const PAGE_SIZES = [25, 50, 75, 100];

const displayDate = (d) => {
  if (!d) return '—';
  if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d.slice(0, 10);
  return '—';
};

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
  from_bank_id: '',
  to_bank_id: '',
  transfer_date: new Date().toISOString().split('T')[0],
  amount: '',
  description: '',
};

export default function BankTransfers({ clinicId }) {
  const { symbol } = useCurrency();
  const fmt = (n) => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [items, setItems] = useState([]);
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/bank-transfers`);
      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch bank transfers.');
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

  const fetchBanks = async () => {
    try {
      const res = await fetch(`${API_URL}/banks?active=true&with_balance=true`);
      const data = await parseJsonResponse(res);
      if (res.ok && Array.isArray(data)) setBanks(data);
    } catch {
      // bank dropdowns just stay empty; the main error message covers fetchItems failures
    }
  };

  useEffect(() => {
    fetchItems();
    fetchBanks();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => setForm(emptyForm);

  const selectedFromBank = banks.find((b) => String(b.id) === String(form.from_bank_id));

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, items.length);

  const changePageSize = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (!form.from_bank_id || !form.to_bank_id) {
        throw new Error('Both from and to bank are required.');
      }
      if (form.from_bank_id === form.to_bank_id) {
        throw new Error('From bank and to bank must be different.');
      }
      if (!form.amount || Number(form.amount) <= 0) {
        throw new Error('Amount must be greater than zero.');
      }
      if (!form.transfer_date) {
        throw new Error('Transfer date is required.');
      }
      if (selectedFromBank && Number(form.amount) > Number(selectedFromBank.balance)) {
        throw new Error(`Insufficient balance. ${selectedFromBank.bank_name} only has ${fmt(selectedFromBank.balance)} available.`);
      }
      const payload = { ...form, clinic_id: clinicId || null };
      const res = await fetch(`${API_URL}/bank-transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Request failed');
      setMessage('Transfer recorded successfully');
      resetForm();
      fetchItems();
      fetchBanks();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleExport = async () => {
    setMessage('');
    try {
      await downloadCsvExport(`${API_URL}/bank-transfers/export`, 'bank_transfers_export.csv');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transfer record?')) return;
    try {
      const res = await fetch(`${API_URL}/bank-transfers/${id}`, { method: 'DELETE' });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setMessage('Transfer deleted successfully');
      fetchItems();
      fetchBanks();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Bank Transfers</h2>
      <p style={{ color: '#666' }}>Move money between the clinic's own bank accounts.</p>

      {message && <div style={{ marginBottom: 16, color: '#0b6e4f' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'start' }}>
          <div>
            <select name="from_bank_id" required value={form.from_bank_id} onChange={handleChange} style={inputStyle}>
              <option value="">From Bank</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name} ({fmt(b.balance)})</option>)}
            </select>
            {selectedFromBank && (
              <div style={{ marginTop: 4, fontSize: 13, color: '#666' }}>Available: {fmt(selectedFromBank.balance)}</div>
            )}
          </div>
          <select name="to_bank_id" required value={form.to_bank_id} onChange={handleChange} style={inputStyle}>
            <option value="">To Bank</option>
            {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name} ({fmt(b.balance)})</option>)}
          </select>
          <input type="date" name="transfer_date" required value={form.transfer_date} onChange={handleChange} style={inputStyle} />
          <input type="number" step="0.01" name="amount" placeholder={`Amount (${symbol})`} required value={form.amount} onChange={handleChange} style={inputStyle} />
          <input name="description" placeholder="Description" value={form.description} onChange={handleChange} style={inputStyle} />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="submit" style={buttonStyle}>Record Transfer</button>
        </div>
      </form>

      <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Transfer History</h3>
          <button className="btn btn-secondary" onClick={handleExport}><Download size={15} />Export</button>
        </div>
        {loading ? <div>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>From Bank</th>
                <th style={thStyle}>To Bank</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{displayDate(item.transfer_date)}</td>
                  <td style={tdStyle}>{item.from_bank_name}</td>
                  <td style={tdStyle}>{item.to_bank_name}</td>
                  <td style={tdStyle}>{fmt(item.amount)}</td>
                  <td style={tdStyle}>{item.description}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDelete(item.id)} style={dangerButtonStyle}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 4px', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#666', margin: 0 }}>Rows per page</label>
              <select value={pageSize} onChange={changePageSize} style={{ ...inputStyle, width: 90 }}>
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#666' }}>Showing {rangeStart}–{rangeEnd} of {items.length}</span>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={secondaryIconButtonStyle}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={secondaryIconButtonStyle}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
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

const dangerButtonStyle = {
  padding: '8px 12px',
  border: '1px solid #fda4af',
  borderRadius: 6,
  background: '#fff1f2',
  color: '#be123c',
  cursor: 'pointer',
};

const secondaryIconButtonStyle = {
  padding: '6px 8px',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  background: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
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
