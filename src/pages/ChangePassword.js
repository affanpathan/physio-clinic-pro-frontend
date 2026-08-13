import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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
  user_id: '',
  current_password: '',
  new_password: '',
  confirm_password: '',
};

export default function ChangePassword({ onPasswordChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShowPassword = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!form.user_id.trim() || !form.current_password || !form.new_password || !form.confirm_password) {
      setIsError(true);
      setMessage('Please fill in all fields.');
      return;
    }
    if (form.new_password.length < 6) {
      setIsError(true);
      setMessage('New password must be at least 6 characters.');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setIsError(true);
      setMessage('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: form.user_id.trim(),
          current_password: form.current_password,
          new_password: form.new_password,
        }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to change password.');
      }
      setIsError(false);
      setMessage(data.message || 'Password changed successfully. Redirecting to login...');
      setForm(emptyForm);
      setTimeout(() => {
        if (onPasswordChanged) onPasswordChanged();
      }, 1200);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Change Password</h2>
      <p style={{ color: '#666' }}>Enter your user ID, current password, and a new password.</p>

      {message && (
        <div style={{ marginBottom: 16, color: isError ? '#be123c' : '#0b6e4f' }}>{message}</div>
      )}

      {/* Intentionally not a <form>: a text input followed by password input(s) inside a
          <form> is exactly what triggers the browser's saved-credentials autofill dropdown,
          and autocomplete="off" does not override that heuristic. */}
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, maxWidth: 420 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            name="user_id"
            placeholder="User ID"
            required
            autoComplete="off"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
            onKeyDown={handleKeyDown}
            value={form.user_id}
            onChange={handleChange}
            style={inputStyle}
          />
          <div style={passwordWrapStyle}>
            <input
              name="current_password"
              type={showPasswords.current_password ? 'text' : 'password'}
              placeholder="Current Password"
              required
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              onKeyDown={handleKeyDown}
              value={form.current_password}
              onChange={handleChange}
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword('current_password')}
              style={eyeButtonStyle}
              tabIndex={-1}
              aria-label={showPasswords.current_password ? 'Hide password' : 'Show password'}
            >
              {showPasswords.current_password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div style={passwordWrapStyle}>
            <input
              name="new_password"
              type={showPasswords.new_password ? 'text' : 'password'}
              placeholder="New Password"
              required
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              onKeyDown={handleKeyDown}
              value={form.new_password}
              onChange={handleChange}
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword('new_password')}
              style={eyeButtonStyle}
              tabIndex={-1}
              aria-label={showPasswords.new_password ? 'Hide password' : 'Show password'}
            >
              {showPasswords.new_password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div style={passwordWrapStyle}>
            <input
              name="confirm_password"
              type={showPasswords.confirm_password ? 'text' : 'password'}
              placeholder="Confirm New Password"
              required
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              onKeyDown={handleKeyDown}
              value={form.confirm_password}
              onChange={handleChange}
              style={{ ...inputStyle, paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => toggleShowPassword('confirm_password')}
              style={eyeButtonStyle}
              tabIndex={-1}
              aria-label={showPasswords.confirm_password ? 'Hide password' : 'Show password'}
            >
              {showPasswords.confirm_password ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleSubmit} style={buttonStyle} disabled={loading}>
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>
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

const passwordWrapStyle = {
  position: 'relative',
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
