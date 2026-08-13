import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function LandingPage({ onLogin, notice = '' }) {
  const [form, setForm] = useState({ user_id: '', user_pass: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.user_id.trim() || !form.user_pass.trim()) {
      setError('Please enter your user ID and password.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(form);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={panelStyle}>
        <div style={leftPanelStyle}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#0f172a' }}>Physio Clinic Pro</h1>
          <p style={{ color: '#475569', marginTop: 10, fontSize: 16, lineHeight: 1.6 }}>
            Manage patients, visits, appointments, ledgers, and clinic records from one streamlined dashboard.
          </p>
          <ul style={{ paddingLeft: 20, color: '#334155', lineHeight: 1.8 }}>
            <li>Patient registration and visit tracking</li>
            <li>Appointment and ledger management</li>
            <li>Clinic master and user administration</li>
            <li>Fast access to real-time clinic data</li>
          </ul>
        </div>

        <div style={rightPanelStyle}>
          <h2 style={{ margin: 0, fontSize: 24 }}>Welcome Back</h2>
          <p style={{ color: '#64748b', marginTop: 8 }}>Sign in to continue to your dashboard.</p>

          {/* Kept separate from `error` so a failed login replaces the login error, not this banner. */}
          {notice ? <div style={noticeStyle}>{notice}</div> : null}

          <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
            <label style={labelStyle}>User ID</label>
            <input
              name="user_id"
              value={form.user_id}
              onChange={handleChange}
              placeholder="Enter user ID"
              style={inputStyle}
            />

            <label style={labelStyle}>Password</label>
            <div style={passwordWrapStyle}>
              <input
                name="user_pass"
                type={showPassword ? 'text' : 'password'}
                value={form.user_pass}
                onChange={handleChange}
                placeholder="Enter password"
                style={{ ...inputStyle, marginBottom: 0, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={eyeButtonStyle}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error ? <div style={errorStyle}>{error}</div> : null}

            <button type="submit" style={buttonStyle} disabled={loading}>
              {loading ? 'Signing In...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

const panelStyle = {
  width: '100%',
  maxWidth: 1100,
  background: '#fff',
  borderRadius: 20,
  boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
  display: 'grid',
  gridTemplateColumns: '1.1fr 0.9fr',
  overflow: 'hidden',
};

const leftPanelStyle = {
  padding: '48px 40px',
  background: '#f8fafc',
};

const rightPanelStyle = {
  padding: '48px 40px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const labelStyle = {
  display: 'block',
  marginBottom: 6,
  fontWeight: 600,
  color: '#334155',
};

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  marginBottom: 14,
};

const buttonStyle = {
  width: '100%',
  padding: '12px 14px',
  border: 'none',
  borderRadius: 10,
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  marginTop: 8,
};

const passwordWrapStyle = {
  position: 'relative',
  marginBottom: 14,
};

const eyeButtonStyle = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
};

const errorStyle = {
  marginTop: 10,
  color: '#b91c1c',
  background: '#fef2f2',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #fecaca',
};

// Amber, not red — an expired session is expected housekeeping, not a failure the user caused.
const noticeStyle = {
  marginTop: 14,
  color: '#92400e',
  background: '#fffbeb',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #fde68a',
};
