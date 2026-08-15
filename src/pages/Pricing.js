import React from 'react';
import { ArrowLeft, Check } from 'lucide-react';

const FEATURE_GROUPS = [
  {
    title: 'Patient Management',
    items: [
      'Unlimited patient records',
      'Demographics, diagnosis & referring-doctor tracking',
      'Search, filter & CSV export',
    ],
  },
  {
    title: 'Appointments & Scheduling',
    items: [
      'Day / week / month calendar view',
      'Slot-based booking with therapy-type selection',
    ],
  },
  {
    title: 'Visits & Billing',
    items: [
      'Multi-therapy visit logging',
      'Fee & payment capture with balance preview',
      'Therapist assignment per visit',
    ],
  },
  {
    title: 'Ledger & Payments',
    items: [
      'Daily clinic-wide income/expense ledger',
      'Per-patient payment ledger',
      'Outstanding dues & advance-credit tracking',
    ],
  },
  {
    title: 'Reports & Analytics',
    items: [
      'Filterable, paginated financial reports',
      'Dashboard with income & visit trends',
      'CSV export on every module',
    ],
  },
  {
    title: 'Staff Management',
    items: [
      'Unlimited therapist & staff logins',
      'Role-based access',
    ],
  },
];

const PLANS = [
  { cycle: 'Monthly', price: '₹700', period: '/ month', effective: '₹700 / mo', savings: null },
  { cycle: 'Quarterly', price: '₹1,890', period: '/ 3 months', effective: '₹630 / mo', savings: 'Save 10%' },
  { cycle: 'Half-Yearly', price: '₹3,570', period: '/ 6 months', effective: '₹595 / mo', savings: 'Save 15%' },
  { cycle: 'Yearly', price: '₹6,300', period: '/ year', effective: '₹525 / mo', savings: 'Save 25% — 3 months free', highlight: true },
];

export default function Pricing({ navigate }) {
  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <button style={backButtonStyle} onClick={() => navigate && navigate('landing')}>
          <ArrowLeft size={16} />
          Back to Login
        </button>

        <div style={heroStyle}>
          <h1 style={{ margin: 0, fontSize: 34, color: '#0f172a' }}>Physio Clinic Pro</h1>
          <p style={{ color: '#475569', marginTop: 10, fontSize: 17, lineHeight: 1.6, maxWidth: 640, margin: '10px auto 0' }}>
            One plan. Every feature. Everything your clinic needs to manage patients, visits,
            appointments, billing, and reporting in one place.
          </p>
        </div>

        <div style={plansGridStyle}>
          {PLANS.map((plan) => (
            <div key={plan.cycle} style={plan.highlight ? { ...planCardStyle, ...planCardHighlightStyle } : planCardStyle}>
              {plan.highlight && <div style={badgeStyle}>Best Value</div>}
              <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{plan.cycle}</h3>
              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: '#0f172a' }}>{plan.price}</span>
                <span style={{ color: '#64748b', marginLeft: 6 }}>{plan.period}</span>
              </div>
              <div style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>{plan.effective}</div>
              {plan.savings && <div style={savingsStyle}>{plan.savings}</div>}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
          Flat fee per clinic. Unlimited patients, therapists & staff logins on every plan.
        </p>

        <div style={featuresWrapStyle}>
          <h2 style={{ textAlign: 'center', fontSize: 22, color: '#0f172a', marginBottom: 24 }}>
            Everything included
          </h2>
          <div style={featuresGridStyle}>
            {FEATURE_GROUPS.map((group) => (
              <div key={group.title} style={featureCardStyle}>
                <h4 style={{ margin: 0, fontSize: 15, color: '#0f172a' }}>{group.title}</h4>
                <ul style={{ listStyle: 'none', padding: 0, marginTop: 10 }}>
                  {group.items.map((item) => (
                    <li key={item} style={featureItemStyle}>
                      <Check size={15} color="#2563eb" style={{ flexShrink: 0, marginTop: 3 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button style={ctaButtonStyle} onClick={() => navigate && navigate('landing')}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
  padding: '40px 24px',
};

const containerStyle = {
  width: '100%',
  maxWidth: 1100,
  margin: '0 auto',
};

const backButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  marginBottom: 24,
  fontSize: 14,
};

const heroStyle = {
  textAlign: 'center',
  marginBottom: 36,
};

const plansGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 18,
};

const planCardStyle = {
  position: 'relative',
  background: '#fff',
  borderRadius: 16,
  padding: '26px 22px',
  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
  border: '1px solid #e2e8f0',
};

const planCardHighlightStyle = {
  border: '2px solid #2563eb',
  boxShadow: '0 16px 36px rgba(37, 99, 235, 0.18)',
};

const badgeStyle = {
  position: 'absolute',
  top: -12,
  right: 18,
  background: '#2563eb',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: 999,
};

const savingsStyle = {
  marginTop: 12,
  display: 'inline-block',
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: 999,
};

const featuresWrapStyle = {
  marginTop: 56,
};

const featuresGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const featureCardStyle = {
  background: '#fff',
  borderRadius: 14,
  padding: '20px 22px',
  border: '1px solid #e2e8f0',
};

const featureItemStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  color: '#334155',
  fontSize: 14,
  marginBottom: 8,
  lineHeight: 1.4,
};

const ctaButtonStyle = {
  padding: '12px 28px',
  border: 'none',
  borderRadius: 10,
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 15,
};
