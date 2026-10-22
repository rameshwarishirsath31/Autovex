import React from 'react';
import HealthGauge from './HealthGauge';
import { 
  Car, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ArrowRight, 
  Play, 
  Square,
  Wrench,
  Fuel,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function DashboardView({
  vehicles = [],
  selectedVehicle,
  onSelectVehicle,
  healthData,
  predictionSummary,
  reminders = [],
  dtcCodes = [],
  simActive,
  onToggleSim,
  onRunPrediction,
  predicting,
  setActiveTab
}) {
  const healthScore = healthData ? healthData.health_score : 92.0;
  const criticalCount = predictionSummary ? predictionSummary.critical_components_count : 0;
  const serviceCount = predictionSummary ? predictionSummary.service_required_count : 0;
  const activeDtcs = dtcCodes.filter(d => !d.cleared);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Welcome & Status Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Fleet Telemetry & AI Health Overview
            </h1>
            <span className="badge badge-monitor" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="pulse-dot"></span> LIVE
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '4px' }}>
            Predictive machine learning telemetry monitoring active across {vehicles.length} vehicle profiles.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className={`btn ${simActive ? 'btn-rose' : 'btn-emerald'}`}
            onClick={onToggleSim}
          >
            {simActive ? <Square size={16} /> : <Play size={16} />}
            {simActive ? 'Stop OBD Simulator' : 'Start OBD Simulator'}
          </button>

          <button 
            className="btn btn-primary"
            onClick={onRunPrediction}
            disabled={predicting}
          >
            {predicting ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {predicting ? 'Evaluating ML...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Metric 1: Overall Health */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: healthScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${healthScore >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: healthScore >= 80 ? '#10b981' : '#ef4444'
          }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Vehicle Health</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              {Math.round(healthScore)}<span style={{ fontSize: '1rem', color: '#64748b' }}>/100</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: healthScore >= 80 ? '#10b981' : '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
              {healthData ? healthData.status : 'Normal Operations'}
            </div>
          </div>
        </div>

        {/* Metric 2: Critical Components */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${criticalCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: criticalCount > 0 ? '#ef4444' : '#10b981'
          }}>
            <AlertCircle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Urgent Replacements</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: criticalCount > 0 ? '#f87171' : '#f8fafc', lineHeight: 1.1 }}>
              {criticalCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {serviceCount} additional services pending
            </div>
          </div>
        </div>

        {/* Metric 3: Active DTC Fault Codes */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: activeDtcs.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${activeDtcs.length > 0 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeDtcs.length > 0 ? '#f59e0b' : '#10b981'
          }}>
            <Wrench size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Active Fault Codes</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: activeDtcs.length > 0 ? '#fbbf24' : '#f8fafc', lineHeight: 1.1 }}>
              {activeDtcs.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              {activeDtcs.length > 0 ? `${activeDtcs[0].code} detected` : 'No OBD errors reported'}
            </div>
          </div>
        </div>

        {/* Metric 4: Reminders Due */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8'
          }}>
            <Clock size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Reminders Due</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.1 }}>
              {reminders.filter(r => r.status === 'Pending').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
              Scheduled periodic services
            </div>
          </div>
        </div>
      </div>

      {/* Main Focus: Vehicle Cockpit & Health Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        {/* Selected Vehicle Showcase */}
        {selectedVehicle && (
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Active Vehicle Telemetry
                  </span>
                  <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                    {selectedVehicle.make} {selectedVehicle.model}
                  </h2>
                </div>
                <span className="badge badge-inspect" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
                  {selectedVehicle.registration_no}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
                <div className="glass-card">
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Odometer</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    {selectedVehicle.odometer_km.toLocaleString()} <span style={{ fontSize: '0.78rem', color: '#64748b' }}>km</span>
                  </div>
                </div>

                <div className="glass-card">
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Model Year</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                    {selectedVehicle.year}
                  </div>
                </div>

                <div className="glass-card">
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Powertrain</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Fuel size={16} color="#38bdf8" />
                    {selectedVehicle.fuel_type}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Driving Style / Usage Profile</span>
                  <span style={{ fontWeight: 600, color: '#38bdf8' }}>{selectedVehicle.usage_pattern} Highway/City</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Calculated wear scaling factor based on simulated OBD stop-go traffic and engine thermal stress.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary"
                onClick={() => setActiveTab('vehicle-detail')}
                style={{ flex: 1 }}
              >
                Inspect 11 Components <ArrowRight size={16} />
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('live-obd')}
              >
                <Activity size={16} /> Live OBD Telemetry
              </button>
            </div>
          </div>
        )}

        {/* Health Score Gauge Display */}
        <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
            Predictive Health Assessment
          </h3>
          <HealthGauge score={healthScore} size={210} />
          <div style={{ textAlign: 'center', maxWidth: '320px', marginTop: '1rem', fontSize: '0.82rem', color: '#94a3b8' }}>
            {healthData ? healthData.summary : 'AI wear models evaluate mechanical tolerances and telemetry variances to predict component end-of-life.'}
          </div>
        </div>
      </div>

      {/* Fleet Vehicles Cards List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
            Registered Fleet Vehicles ({vehicles.length})
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {vehicles.map((v) => {
            const isSelected = selectedVehicle && selectedVehicle.id === v.id;
            return (
              <div 
                key={v.id} 
                onClick={() => onSelectVehicle(v.id)}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  boxShadow: isSelected ? '0 0 16px rgba(6, 182, 212, 0.25)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? '#38bdf8' : '#94a3b8'
                    }}>
                      <Car size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {v.make} {v.model}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {v.year} &bull; {v.fuel_type} &bull; {v.usage_pattern}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-inspect" style={{ fontSize: '0.72rem' }}>
                    {v.registration_no}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                  <span style={{ color: '#94a3b8' }}>Mileage</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{v.odometer_km.toLocaleString()} km</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
