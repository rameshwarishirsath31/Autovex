import React from 'react';
import { 
  Car, 
  Activity, 
  AlertTriangle, 
  Clock, 
  FileText, 
  ShieldCheck, 
  LogOut, 
  ChevronDown,
  Cpu
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  vehicles = [], 
  selectedVehicleId, 
  setSelectedVehicleId, 
  user, 
  onLogout 
}) {
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(10, 14, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0.75rem 1.5rem',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveTab('dashboard')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
          }}>
            <Cpu size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                AUTO<span style={{ color: '#06b6d4' }}>VEX</span>
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                AI ML
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
              Predictive Maintenance Cockpit
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <ShieldCheck size={16} />
            Dashboard
          </button>
          <button 
            className={`nav-link ${activeTab === 'vehicle-detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicle-detail')}
          >
            <Car size={16} />
            Component Risk
          </button>
          <button 
            className={`nav-link ${activeTab === 'live-obd' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-obd')}
          >
            <Activity size={16} />
            Live OBD-II
          </button>
          <button 
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={16} />
            History
          </button>
          <button 
            className={`nav-link ${activeTab === 'reminders' ? 'active' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            <AlertTriangle size={16} />
            Reminders & Schedule
          </button>
          <button 
            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <FileText size={16} />
            Reports
          </button>
        </nav>

        {/* Right Section: Vehicle Selector & User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {vehicles.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>VEHICLE:</span>
              <select
                className="form-select"
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  width: 'auto',
                  minWidth: '190px'
                }}
                value={selectedVehicleId || (selectedVehicle ? selectedVehicle.id : '')}
                onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.registration_no})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User profile & Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            paddingLeft: '0.75rem',
            borderLeft: '1px solid var(--border-subtle)'
          }}>
            <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>
                {user ? user.name : 'Demo User'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <span className="pulse-dot"></span>
                Online
              </div>
            </div>

            <button 
              className="btn btn-secondary btn-sm"
              title="Logout"
              onClick={onLogout}
              style={{ padding: '0.45rem', borderRadius: '8px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
