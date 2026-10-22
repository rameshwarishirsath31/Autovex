import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Square, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge, 
  Thermometer, 
  Zap, 
  Fuel, 
  Plus, 
  X,
  Radio
} from 'lucide-react';
import { obdApi, vehicleApi } from '../api';

export default function LiveOBDView({
  selectedVehicle,
  simActive,
  onToggleSim
}) {
  const [telemetry, setTelemetry] = useState({
    rpm: 2150,
    speed_kmh: 52.0,
    coolant_temp_c: 91.5,
    throttle_pct: 32.0,
    engine_load_pct: 44.0,
    fuel_level_pct: 68.4,
    battery_voltage: 14.1
  });

  const [history, setHistory] = useState([]);
  const [dtcCodes, setDtcCodes] = useState([]);
  const [showAddDtcModal, setShowAddDtcModal] = useState(false);
  const [newDtc, setNewDtc] = useState({ code: 'P0301', description: 'Cylinder 1 Misfire Detected', severity: 'High' });
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  // Fetch initial DTC codes and telemetry
  const fetchInitialData = async () => {
    if (!selectedVehicle) return;
    try {
      const dtcs = await vehicleApi.getDTC(selectedVehicle.id);
      setDtcCodes(dtcs);

      const hist = await obdApi.getHistory(selectedVehicle.id, 25);
      if (hist && hist.length > 0) {
        setHistory(hist);
        setTelemetry(hist[hist.length - 1]);
      }
    } catch (e) {
      console.error('Error fetching initial OBD data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [selectedVehicle]);

  // WebSocket Connection for Real-Time Streaming
  useEffect(() => {
    if (!selectedVehicle) return;

    let socket;
    let pollInterval;

    try {
      const wsUrl = `ws://localhost:8000/ws/obd/${selectedVehicle.id}`;
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry(data);
          setHistory(prev => {
            const next = [...prev, data];
            return next.slice(-30);
          });
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      socket.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      setWsConnected(false);
    }

    // Polling fallback every 2.5s if simulation is active
    pollInterval = setInterval(async () => {
      if (simActive && selectedVehicle) {
        try {
          const latest = await obdApi.getLatest(selectedVehicle.id);
          if (latest) {
            setTelemetry(latest);
            setHistory(prev => {
              const next = [...prev, latest];
              return next.slice(-30);
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }, 2500);

    return () => {
      if (socket) socket.close();
      clearInterval(pollInterval);
    };
  }, [selectedVehicle, simActive]);

  const handleClearDtc = async (dtcId) => {
    try {
      await vehicleApi.clearDTC(selectedVehicle.id, dtcId);
      setDtcCodes(prev => prev.map(d => d.id === dtcId ? { ...d, cleared: true } : d));
    } catch (e) {
      alert('Failed to clear DTC code: ' + e.message);
    }
  };

  const handleAddDtc = async (e) => {
    e.preventDefault();
    try {
      const created = await vehicleApi.addDTC(selectedVehicle.id, newDtc);
      setDtcCodes(prev => [created, ...prev]);
      setShowAddDtcModal(false);
    } catch (e) {
      alert('Failed to inject DTC: ' + e.message);
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Please select a vehicle to monitor live OBD-II telemetry.</p>
      </div>
    );
  }

  // Calculate SVG sparkline points for Speed and RPM
  const maxSpeed = 160;
  const maxRpm = 6000;
  const chartHeight = 120;
  const chartWidth = 500;

  const speedPoints = history.map((pt, idx) => {
    const x = (idx / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - (pt.speed_kmh / maxSpeed) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const rpmPoints = history.map((pt, idx) => {
    const x = (idx / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - (pt.rpm / maxRpm) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const activeDtcs = dtcCodes.filter(d => !d.cleared);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Control Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              OBD-II CAN-Bus Live Cockpit
            </h2>
            <span className="badge badge-inspect">{selectedVehicle.registration_no}</span>
            <span 
              className={`badge ${wsConnected || simActive ? 'badge-monitor' : 'badge-inspect'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Radio size={12} className={simActive ? 'animate-pulse' : ''} />
              {simActive ? 'STREAMING ACTIVE' : (wsConnected ? 'WS CONNECTED' : 'STANDBY')}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Broadcasting 2 Hz ISO-15765-4 OBD telemetry. Simulated ELM327 controller feed.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className={`btn ${simActive ? 'btn-rose' : 'btn-emerald'}`}
            onClick={onToggleSim}
            style={{ padding: '0.65rem 1.35rem' }}
          >
            {simActive ? <Square size={16} /> : <Play size={16} />}
            {simActive ? 'Halt Telemetry Stream' : 'Start OBD Simulation'}
          </button>
        </div>
      </div>

      {/* Primary Cockpit Instruments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {/* Speedometer */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Vehicle Velocity
          </span>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1.1, marginTop: '0.5rem', textShadow: '0 0 20px rgba(56, 189, 248, 0.4)' }}>
            {Math.round(telemetry.speed_kmh)}
          </div>
          <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>KM / H</span>

          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', marginTop: '1.25rem', overflow: 'hidden' }}>
            <div style={{ width: `${(telemetry.speed_kmh / 160) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Tachometer (RPM) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Engine Revolutions
          </span>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: telemetry.rpm > 4500 ? '#ef4444' : '#10b981', lineHeight: 1.1, marginTop: '0.5rem', textShadow: telemetry.rpm > 4500 ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(16, 185, 129, 0.4)' }}>
            {Math.round(telemetry.rpm)}
          </div>
          <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>RPM</span>

          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', marginTop: '1.25rem', overflow: 'hidden' }}>
            <div style={{ width: `${(telemetry.rpm / 6500) * 100}%`, height: '100%', background: telemetry.rpm > 4500 ? '#ef4444' : '#10b981', transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* Coolant Temperature */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>
            <Thermometer size={16} /> Engine Coolant Temp
          </div>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: telemetry.coolant_temp_c > 100 ? '#ef4444' : (telemetry.coolant_temp_c > 95 ? '#f59e0b' : '#f8fafc'), lineHeight: 1.1, marginTop: '0.5rem' }}>
            {telemetry.coolant_temp_c.toFixed(1)}°
          </div>
          <span style={{ fontSize: '0.88rem', color: '#64748b', fontWeight: 600 }}>CELSIUS (Normal 85-98°C)</span>

          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', marginTop: '1.25rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (telemetry.coolant_temp_c / 120) * 100)}%`, height: '100%', background: telemetry.coolant_temp_c > 100 ? '#ef4444' : '#06b6d4' }} />
          </div>
        </div>
      </div>

      {/* Auxiliary Gauges Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>THROTTLE POSITION</span>
            <span style={{ color: '#38bdf8', fontWeight: 700 }}>{Math.round(telemetry.throttle_pct)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${telemetry.throttle_pct}%`, height: '100%', background: '#38bdf8', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>CALCULATED LOAD</span>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>{Math.round(telemetry.engine_load_pct)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${telemetry.engine_load_pct}%`, height: '100%', background: '#f59e0b', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>ALTERNATOR VOLTAGE</span>
            <span style={{ color: '#10b981', fontWeight: 700 }}>{telemetry.battery_voltage.toFixed(2)} V</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${((telemetry.battery_voltage - 11.0) / 4.0) * 100}%`, height: '100%', background: '#10b981' }} />
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>FUEL TANK LEVEL</span>
            <span style={{ color: '#a855f7', fontWeight: 700 }}>{Math.round(telemetry.fuel_level_pct)}%</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${telemetry.fuel_level_pct}%`, height: '100%', background: '#a855f7' }} />
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Graph */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Live Telemetry Waveform (Past 30 Cycles)
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Cyan: Vehicle Velocity (km/h) &bull; Green: Engine RPM (scaled)
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sampling Rate: 0.5 Hz (2.0s interval)</span>
        </div>

        <div style={{ width: '100%', height: '140px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '0.75rem', position: 'relative' }}>
          {history.length > 1 ? (
            <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="30" x2={chartWidth} y2="30" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="60" x2={chartWidth} y2="60" stroke="rgba(255,255,255,0.05)" />
              <line x1="0" y1="90" x2={chartWidth} y2="90" stroke="rgba(255,255,255,0.05)" />

              {/* Speed line */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                points={speedPoints}
              />

              {/* RPM line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                points={rpmPoints}
              />
            </svg>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.85rem' }}>
              Start OBD simulation above to view live CAN-bus telemetry charts.
            </div>
          )}
        </div>
      </div>

      {/* Active Diagnostic Trouble Codes (DTC) Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              Diagnostic Trouble Codes (DTC)
            </h3>
            <span className="badge badge-inspect">{activeDtcs.length} Active</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddDtcModal(true)}
          >
            <Plus size={14} /> Inject Test Fault
          </button>
        </div>

        {activeDtcs.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> No active fault codes reported. Electronic control units (ECU) clean.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeDtcs.map((dtc) => (
              <div 
                key={dtc.id} 
                className="glass-card" 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(245, 158, 11, 0.3)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                    {dtc.code}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                      {dtc.description}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Severity: <span style={{ color: dtc.severity === 'Critical' ? '#ef4444' : '#f59e0b' }}>{dtc.severity}</span> &bull; Detected: {new Date(dtc.detected_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleClearDtc(dtc.id)}
                  style={{ fontSize: '0.75rem' }}
                >
                  Clear Code
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add DTC Fault Injection Modal */}
      {showAddDtcModal && (
        <div className="modal-backdrop" onClick={() => setShowAddDtcModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                Inject Test OBD Diagnostic Code
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddDtcModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDtc} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Select Preset Fault Code:
                </label>
                <select 
                  className="form-select"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'P0300') setNewDtc({ code: 'P0300', description: 'Random/Multiple Cylinder Misfire Detected', severity: 'High' });
                    if (val === 'P0420') setNewDtc({ code: 'P0420', description: 'Catalyst System Efficiency Below Threshold', severity: 'Medium' });
                    if (val === 'P0171') setNewDtc({ code: 'P0171', description: 'System Too Lean Bank 1', severity: 'Medium' });
                    if (val === 'P0117') setNewDtc({ code: 'P0117', description: 'Engine Coolant Temperature Circuit Low Input', severity: 'Critical' });
                  }}
                >
                  <option value="P0300">P0300 - Random/Multiple Cylinder Misfire</option>
                  <option value="P0420">P0420 - Catalyst System Efficiency Low</option>
                  <option value="P0171">P0171 - System Too Lean Bank 1</option>
                  <option value="P0117">P0117 - Coolant Temperature Circuit Critical</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Code Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newDtc.code}
                  onChange={e => setNewDtc({ ...newDtc, code: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={newDtc.description}
                  onChange={e => setNewDtc({ ...newDtc, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Severity
                </label>
                <select
                  className="form-select"
                  value={newDtc.severity}
                  onChange={e => setNewDtc({ ...newDtc, severity: e.target.value })}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDtcModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Inject Fault Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
