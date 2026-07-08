import React, { useState } from 'react';
import { Activity, Users, Calendar, BookOpen, BarChart2, Menu, X, Stethoscope, CreditCard, Clock } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Appointments from './pages/Appointments';
import DailyLedger from './pages/DailyLedger';
import PatientLedger from './pages/PatientLedger';
import PatientDues from './pages/PatientDues';
import './App.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'visits', label: 'Visits', icon: Calendar },
  { id: 'appointments', label: 'Appointments', icon: Clock },
  { id: 'daily-ledger', label: 'Daily Ledger', icon: BookOpen },
  { id: 'patient-ledger', label: 'Patient Ledger', icon: Activity },
  { id: 'patient-dues', label: 'Patient Dues', icon: CreditCard },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const navigate = (p, patient = null) => {
    setPage(p);
    if (patient) setSelectedPatient(patient);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div className="brand">
            <Stethoscope size={22} className="brand-icon" />
            {sidebarOpen && <span className="brand-name">PhysioClinic<em>Pro</em></span>}
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
        </div>
      </aside>

      <main className="main-content">
        <div className="page-wrapper">
          {page === 'dashboard' && <Dashboard navigate={navigate} />}
          {page === 'patients' && <Patients navigate={navigate} setSelectedPatient={setSelectedPatient} />}
          {page === 'visits' && <Visits />}
          {page === 'appointments' && <Appointments />}
          {page === 'daily-ledger' && <DailyLedger />}
          {page === 'patient-ledger' && <PatientLedger selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient} />}
          {page === 'patient-dues' && <PatientDues />}
        </div>
      </main>
    </div>
  );
}
