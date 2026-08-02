import React, { useEffect, useState } from 'react';
import { Activity, Users, Calendar, BookOpen, BarChart2, Menu, X, Stethoscope, CreditCard, Clock, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Appointments from './pages/Appointments';
import DailyLedger from './pages/DailyLedger';
import PatientLedger from './pages/PatientLedger';
import PatientDues from './pages/PatientDues';
import ClinicMaster from './pages/ClinicMaster';
import ClinicUsers from './pages/ClinicUsers';
import Therapists from './pages/Therapists';
import LandingPage from './pages/LandingPage';
import './App.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'visits', label: 'Visits', icon: Calendar },
  { id: 'appointments', label: 'Appointments', icon: Clock },
  { id: 'daily-ledger', label: 'Daily Ledger', icon: BookOpen },
  { id: 'therapists', label: 'Therapists', icon: Stethoscope },
  { id: 'patient-ledger', label: 'Patient Ledger', icon: Activity },
  { id: 'patient-dues', label: 'Patient Dues', icon: CreditCard },
];

const AUTH_STORAGE_KEY = 'physioClinicAuth';
const ADMIN_STORAGE_KEY = 'physioClinicAdmin';

export default function App() {
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 'landing';
    const hash = window.location.hash.replace(/^#/, '').replace(/^\//, '').toLowerCase();
    const searchPage = new URLSearchParams(window.location.search).get('page')?.toLowerCase();
    const pathname = window.location.pathname.replace(/^\//, '').replace(/\/$/, '').toLowerCase();
    const pathMatch = pathname.match(/(^|\/)(clinic-master|clinic-users|therapists)(\/|$)/);
    const effectivePath = pathMatch ? pathMatch[2] : null;

    if (hash === 'clinic-master' || searchPage === 'clinic-master' || effectivePath === 'clinic-master') return 'clinic-master';
    if (hash === 'clinic-users' || searchPage === 'clinic-users' || effectivePath === 'clinic-users') return 'clinic-users';
    if (hash === 'therapists' || searchPage === 'therapists' || effectivePath === 'therapists') return 'therapists';
    return 'landing';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [token, setToken] = useState('');
  const [adminAuthorized, setAdminAuthorized] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        if (parsed?.token) {
          setToken(parsed.token);
          setClinicId(parsed.clinicId || '');
          setClinicName(parsed.clinicName || '');
          setLoggedIn(true);
          if (page === 'landing') {
            setPage('dashboard');
          }
        }
      } catch (error) {
        console.warn('Failed to restore auth from localStorage', error);
      }
    }

    const storedAdminToken = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (storedAdminToken) {
      setAdminToken(storedAdminToken);
      setAdminAuthorized(true);
    }

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const headers = new Headers(init?.headers || {});
      const requestUrl = typeof input === 'string' ? input : input?.url || '';
      const isAdminRequest = /\/api\/(admin|clinic-master|clinic-users)(\/|$)/.test(requestUrl);
      if (isAdminRequest && adminToken) {
        headers.set('Authorization', `Bearer ${adminToken}`);
      } else if (!isAdminRequest && token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return originalFetch(input, { ...init, headers });
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [token, adminToken]);

  const navigate = (p, patient = null) => {
    setPage(p);
    if (patient) setSelectedPatient(patient);
    if (p !== 'clinic-master' && p !== 'clinic-users' && p !== 'therapists') {
      setAdminAuthorized(false);
      setAdminPassword('');
      setAdminError('');
    } else if (adminToken) {
      setAdminAuthorized(true);
    }
  };

  const handleAdminValidate = async () => {
    if (!adminPassword) {
      setAdminError('Please enter the admin password.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    try {
      const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
      const response = await fetch(`${apiBaseUrl}/admin/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setAdminError(data.error || 'Invalid admin password.');
        setAdminAuthorized(false);
      } else {
        setAdminAuthorized(true);
        const newAdminToken = data.adminToken || '';
        setAdminToken(newAdminToken);
        if (typeof window !== 'undefined' && newAdminToken) {
          window.localStorage.setItem(ADMIN_STORAGE_KEY, newAdminToken);
        }
      }
    } catch (err) {
      setAdminError('Unable to validate admin password.');
      setAdminAuthorized(false);
    } finally {
      setAdminLoading(false);
    }
  };

  const isAdminPage = page === 'clinic-master' || page === 'clinic-users';

  const handleLogout = () => {
    setLoggedIn(false);
    setPage('landing');
    setSelectedPatient(null);
    setClinicId('');
    setClinicName('');
    setToken('');
    setAdminToken('');
    setAdminAuthorized(false);
    setAdminPassword('');
    setAdminError('');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    }
  };

  const handleLogin = async ({ user_id, user_pass }) => {
    const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';
    const response = await fetch(`${apiBaseUrl}/clinic-users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, user_pass }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Invalid user ID or password.');
    }
    const resolvedToken = data?.token || '';
    const resolvedClinicId = data?.clinic_id || data?.user?.clinic_id || '';
    const resolvedClinicName = data?.clinic_name || data?.user?.clinic_name || '';
    setLoggedIn(true);
    setToken(resolvedToken);
    setClinicId(resolvedClinicId);
    setClinicName(resolvedClinicName);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token: resolvedToken, clinicId: resolvedClinicId, clinicName: resolvedClinicName })
      );
    }
    if (page === 'landing') {
      navigate('dashboard');
    }
  };

  if (!loggedIn && !isAdminPage) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <Stethoscope size={22} className="brand-icon" />
            {sidebarOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="brand-name">PhysioClinic<em>Pro</em></span>
                <span style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{clinicName || 'Clinic Name'}</span>
              </div>
            )}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{label}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {sidebarOpen && <p className="version">v1.0.0 &nbsp;·&nbsp; 2026 <br />Affan Pathan #9427778630</p>}
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: 12, width: '100%', justifyContent: 'flex-start' }}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">
          {page === 'landing' && <LandingPage onLogin={handleLogin} />}
          {page === 'dashboard' && <Dashboard navigate={navigate} />}
          {page === 'patients' && <Patients navigate={navigate} setSelectedPatient={setSelectedPatient} />}
          {page === 'visits' && <Visits />}
          {page === 'appointments' && <Appointments />}
          {page === 'daily-ledger' && <DailyLedger />}
          {page === 'patient-ledger' && <PatientLedger selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient} />}
          {page === 'patient-dues' && <PatientDues />}
          {page === 'clinic-master' && adminAuthorized && <ClinicMaster />}
          {page === 'clinic-users' && adminAuthorized && <ClinicUsers />}
          {page === 'therapists' && <Therapists clinicId={clinicId} />}
        </div>
        {isAdminPage && !adminAuthorized && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal" style={{ width: 420, padding: 24, borderRadius: 18, background: '#ffffff', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.15)' }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>Admin Verification Required</h2>
                <p style={{ margin: '10px 0 0', color: '#475569' }}>Enter the system admin password to continue.</p>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Admin password"
                  className="form-input"
                  style={{ width: '100%' }}
                />
                {adminError && <div className="alert alert-error" style={{ margin: 0 }}>{adminError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button className="btn btn-ghost" onClick={() => { setAdminPassword(''); setAdminError(''); }} disabled={adminLoading}>Clear</button>
                  <button className="btn btn-primary" onClick={handleAdminValidate} disabled={adminLoading}>
                    {adminLoading ? 'Verifying...' : 'Verify Admin'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
