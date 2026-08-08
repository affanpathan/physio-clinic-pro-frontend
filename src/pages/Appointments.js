import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';
import { useKeyboardListNav } from '../hooks/useKeyboardListNav';
import { useEscapeKey } from '../hooks/useEscapeKey';
const API_URL = process.env.REACT_APP_API_URL || '/api';

const THERAPY_TYPES = ['Manual Therapy', 'Exercise Therapy', 'Electrotherapy', 'Ultrasound', 'TENS', 'Heat Therapy', 'Cold Therapy', 'Dry Needling', 'Cupping', 'Hydrotherapy', 'Taping', 'Post-surgical Rehab', 'Sports Rehab', 'Other'];

const timeSlots = Array.from({ length: 36 }, (_, i) => {
  const hour = 6 + Math.floor(i / 2);
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
});

export default function Appointments() {
  const [view, setView] = useState('week'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingForm, setBookingForm] = useState({ patient_id: '', therapy_type: '', notes: '' });
  const [patients, setPatients] = useState([]);
  const [patSearch, setPatSearch] = useState('');
  const [error, setError] = useState('');

  const loadAppointments = useCallback((startDate, endDate) => {
    setLoading(true);
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    fetch(`${API_URL}/appointments?start_date=${start}&end_date=${end}`)
      .then(r => r.json())
      .then(data => { setAppointments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setAppointments([]); setLoading(false); });
  }, []);

  useEffect(() => {
    const [start, end] = getDateRange();
    loadAppointments(start, end);
  }, [currentDate, view, loadAppointments]);

  useEffect(() => {
    if (patSearch.length >= 2) {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(patSearch)}`)
        .then(r => r.json()).then(setPatients)
        .catch(() => setPatients([]));
    } else {
      setPatients([]);
    }
  }, [patSearch]);

  const getDateRange = () => {
    const date = new Date(currentDate);
    if (view === 'day') {
      date.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      return [date, end];
    } else if (view === 'week') {
      const day = date.getDay();
      const start = new Date(date);
      start.setDate(date.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return [start, end];
    } else { // month
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      return [start, end];
    }
  };

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleSlotClick = (date, time) => {
    setSelectedSlot({ date, time });
    setBookingForm({ patient_id: '', therapy_type: '', notes: '' });
    setError('');
    setShowBookingModal(true);
  };

  const selectBookingPatient = (p) => {
    setBookingForm(f => ({ ...f, patient_id: p.id }));
    setPatSearch(`${p.first_name} ${p.last_name}`);
    setPatients([]);
  };

  const { highlightedIndex: patHighlight, setHighlightedIndex: setPatHighlight, onKeyDown: onPatSearchKeyDown } =
    useKeyboardListNav(patients, selectBookingPatient, () => setPatients([]));

  useEscapeKey(showBookingModal, () => setShowBookingModal(false));

  const handleBookingSubmit = async () => {
    if (!selectedSlot || !bookingForm.patient_id) {
      setError('Please select a patient');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: bookingForm.patient_id || null,
          appointment_date: selectedSlot.date,
          appointment_time: selectedSlot.time,
          duration_minutes: 30,
          therapy_type: bookingForm.therapy_type,
          status: 'scheduled',
          notes: bookingForm.notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to create appointment');
      const [start, end] = getDateRange();
      loadAppointments(start, end);
      setShowBookingModal(false);
      setSelectedSlot(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const getAppointmentForSlot = (date, time) => {
    return appointments.find(a => a.appointment_date === date && a.appointment_time === time);
  };

  const getTimeSlotColor = (time) => {
    const [hour, min] = time.split(':').map(Number);
    const totalMins = hour * 60 + min;
    const morningStart = 6 * 60; // 6:00 AM
    const morningEnd = 12 * 60; // 12:00 PM
    const afternoonStart = 12 * 60; // 12:00 PM
    const afternoonEnd = 18 * 60; // 5:00 PM
    const eveningStart = 18 * 60; // 6:00 PM
    const eveningEnd = 23 * 60 + 30; // 11:30 PM

    if (totalMins >= morningStart && totalMins < morningEnd) return 'time-slot-morning';
    if (totalMins >= afternoonStart && totalMins < afternoonEnd) return 'time-slot-afternoon';
    if (totalMins >= eveningStart && totalMins <= eveningEnd) return 'time-slot-evening';
    return '';
  };

  const renderDayView = () => {
    const [start] = getDateRange();
    const dateStr = formatDate(start);
    return (
      <div className="calendar-day-view">
        <div className="calendar-time-slots">
          {timeSlots.map(time => {
            const apt = getAppointmentForSlot(dateStr, time);
            const slotColor = getTimeSlotColor(time);
            return (
              <div key={time} className="time-slot-row">
                <div className="time-label">{time}</div>
                <button
                  className={`time-slot ${apt ? 'booked' : 'available'} ${slotColor}`}
                  onClick={() => !apt && handleSlotClick(dateStr, time)}
                  disabled={!!apt}
                  title={apt ? `${apt.first_name} ${apt.last_name}` : 'Click to book'}
                >
                  {apt ? `${apt.first_name?.charAt(0)}${apt.last_name?.charAt(0)}` : '+'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const [start] = getDateRange();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="calendar-week-view">
        <div className="week-header">
          <div></div>
          {days.map(d => (
            <div key={formatDate(d)} className="week-day-header">
              <div className="day-name">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</div>
              <div className="day-date">{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-grid">
          {timeSlots.map(time => (
            <div key={time} className="week-time-row">
              <div className="week-time-label">{time}</div>
              {days.map(d => {
                const dateStr = formatDate(d);
                const apt = getAppointmentForSlot(dateStr, time);
                const slotColor = getTimeSlotColor(time);
                return (
                  <button
                    key={dateStr}
                    className={`week-slot ${apt ? 'booked' : 'available'} ${slotColor}`}
                    onClick={() => !apt && handleSlotClick(dateStr, time)}
                    disabled={!!apt}
                    title={apt ? `${apt.first_name} ${apt.last_name}` : 'Click to book'}
                  >
                    {apt ? `${apt.first_name?.charAt(0)}${apt.last_name?.charAt(0)}` : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="calendar-month-view">
        <div className="month-header">
          {dayNames.map(name => (
            <div key={name} className="month-day-name">{name}</div>
          ))}
        </div>
        <div className="month-grid">
          {days.map(d => {
            const dateStr = formatDate(d);
            const dayApts = appointments.filter(a => a.appointment_date === dateStr);
            const isCurrentMonth = d.getMonth() === month;
            return (
              <div
                key={dateStr}
                className={`month-day ${isCurrentMonth ? 'current-month' : 'other-month'} ${dayApts.length > 0 ? 'has-appointments' : ''}`}
                onClick={() => {
                  setCurrentDate(d);
                  setView('day');
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="month-date">{d.getDate()}</div>
                <div className="month-apt-count">
                  {dayApts.length > 0 && <span className="apt-badge">{dayApts.length}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const [start, end] = getDateRange();
  const periodLabel = view === 'day'
    ? currentDate.toLocaleDateString()
    : view === 'week'
      ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
      : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Appointments</h1>
        <p className="page-subtitle">Manage therapy appointments with 15-minute slot booking</p>
      </div>

      <div className="calendar-controls">
        <div className="control-group">
          <button className="btn btn-ghost" onClick={handlePrev}><ChevronLeft size={16} /></button>
          <span className="period-label">{periodLabel}</span>
          <button className="btn btn-ghost" onClick={handleNext}><ChevronRight size={16} /></button>
        </div>
        <div className="control-group">
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              className={`btn ${view === v ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Loading appointments...</p></div>
        ) : view === 'day' ? (
          renderDayView()
        ) : view === 'week' ? (
          renderWeekView()
        ) : (
          renderMonthView()
        )}
      </div>

      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <span className="modal-title">Book Appointment</span>
              <button className="btn btn-sm btn-icon" onClick={() => setShowBookingModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {selectedSlot && (
                <>
                  <div style={{ marginBottom: 16, padding: 12, background: 'var(--teal-50)', borderRadius: 8, border: '1px solid var(--teal-200)' }}>
                    <div style={{ fontSize: 12, color: 'var(--slate-light)', marginBottom: 4 }}>Selected Slot</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--teal-900)' }}>
                      {selectedSlot.date} at {selectedSlot.time}
                    </div>
                  </div>

                  <div className="form-section">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>Patient *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search and select patient (required)"
                        value={patSearch}
                        onChange={e => setPatSearch(e.target.value)}
                        onKeyDown={onPatSearchKeyDown}
                      />
                      {patients.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 7, zIndex: 20, boxShadow: 'var(--shadow-md)', marginTop: 2, maxHeight: 150, overflowY: 'auto' }}>
                          {patients.map((p, i) => (
                            <div
                              key={p.id}
                              onClick={() => selectBookingPatient(p)}
                              onMouseEnter={() => setPatHighlight(i)}
                              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13, background: i === patHighlight ? 'var(--teal-50)' : '#fff' }}
                            >
                              {p.first_name} {p.last_name} ({p.patient_id})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-section">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>Therapy Type</label>
                    <select className="form-select" value={bookingForm.therapy_type} onChange={e => setBookingForm({ ...bookingForm, therapy_type: e.target.value })}>
                      <option value="">Select therapy type</option>
                      {THERAPY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-section">
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: 'var(--slate)' }}>Notes</label>
                    <textarea
                      className="form-input"
                      placeholder="Additional notes..."
                      value={bookingForm.notes}
                      onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      style={{ minHeight: 60, resize: 'vertical' }}
                    />
                  </div>

                  {error && (
                    <div style={{ padding: 10, background: '#fee', border: '1px solid #fcc', borderRadius: 6, color: '#c33', fontSize: 12, marginBottom: 12 }}>
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowBookingModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBookingSubmit}>Book Appointment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
