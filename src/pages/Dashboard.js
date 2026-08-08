import React, { useState, useEffect } from 'react';
import { Users, Calendar, TrendingUp, AlertCircle, Clock, Banknote } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCurrency } from '../context/CurrencyContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';
console.log(API_URL);

const CustomTooltip = ({ active, payload, label }) => {
  const { symbol } = useCurrency();
  const fmt = (n) => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #DDE8E4', borderRadius: 7, padding: '8px 12px', fontSize: 12.5 }}>
        <p style={{ fontWeight: 600, color: '#0D4F4F', marginBottom: 4 }}>{label}</p>
        <p style={{ color: '#3AAA7A' }}>Income: {fmt(payload[0]?.value)}</p>
        <p style={{ color: '#0F5E5E' }}>Visits: {payload[1]?.value}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ navigate }) {
  const { symbol } = useCurrency();
  const fmt = (n) => symbol + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/dashboard`)
      .then(r => { if (!r.ok) throw new Error('Failed to load dashboard'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state"><p>Loading dashboard...</p></div>;
  if (!data) return <div className="empty-state"><p>Could not load dashboard. Check server connection.</p></div>;

  const stats = [
    { label: "Today's Visits", value: data.today_visits, icon: Calendar, mod: '' },
    { label: "Today's Income", value: fmt(data.today_income), icon: Banknote, mod: 'green' },
    { label: 'Active Patients', value: data.total_patients, icon: Users, mod: '' },
    { label: 'Monthly Income', value: fmt(data.monthly_income), icon: TrendingUp, mod: '' },
    { label: 'Pending Balance', value: fmt(data.pending_balance), icon: AlertCircle, mod: 'coral' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.mod}`}>
            <div className="stat-icon"><s.icon size={48} /></div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly Overview</span>
          </div>
          <div className="card-body" style={{ padding: '16px 12px 12px' }}>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weekly_data} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDE8E4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#718096' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} tickFormatter={v => symbol + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="income" fill="#3AAA7A" radius={[4,4,0,0]} name="Income" />
                  <Bar dataKey="visits" fill="#1A7070" radius={[4,4,0,0]} name="Visits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Visits</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('visits')}>View All</button>
          </div>
          <div>
            {data.recent_visits?.length === 0 && (
              <div className="empty-state" style={{ padding: 30 }}><p>No visits yet</p></div>
            )}
            {data.recent_visits?.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--teal-800)', flexShrink: 0 }}>
                  {v.first_name?.[0]}{v.last_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--teal-900)' }}>{v.first_name} {v.last_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--slate-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} />{v.visit_date} · {v.therapy_type || 'Therapy'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amount-income" style={{ fontSize: 13 }}>{symbol}{Number(v.amount_paid).toLocaleString('en-IN')}</div>
                  <span className={`badge badge-${v.payment_status}`} style={{ fontSize: 10.5 }}>{v.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
