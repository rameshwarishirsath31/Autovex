import React, { useState } from 'react';
import HealthGauge from './HealthGauge';
import { 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  Gauge, 
  HelpCircle,
  Filter
} from 'lucide-react';

export default function VehicleDetailView({
  selectedVehicle,
  predictions = [],
  healthData,
  onRunPrediction,
  predicting
}) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [selectedCompModal, setSelectedCompModal] = useState(null);

  if (!selectedVehicle) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Please select a vehicle from the top navbar to view component diagnostics.</p>
      </div>
    );
  }

  const filteredPredictions = predictions.filter(p => {
    if (filterCategory === 'All') return true;
    if (filterCategory === 'Urgent') return p.recommendation === 'Replace' || p.recommendation === 'Service';
    return p.category === filterCategory;
  });

  const getRecommendationBadge = (rec) => {
    switch (rec) {
      case 'Monitor':
        return <span className="badge badge-monitor">Monitor</span>;
      case 'Inspect':
        return <span className="badge badge-inspect">Inspect</span>;
      case 'Service':
        return <span className="badge badge-service">Service</span>;
      case 'Replace':
        return <span className="badge badge-replace">Replace</span>;
      default:
        return <span className="badge badge-monitor">{rec}</span>;
    }
  };

  const getProgressBarColor = (score) => {
    if (score >= 85) return '#ef4444'; // Red
    if (score >= 70) return '#f97316'; // Orange
    if (score >= 40) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Vehicle Header */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
                {selectedVehicle.make} {selectedVehicle.model}
              </h2>
              <span className="badge badge-inspect" style={{ fontSize: '0.85rem' }}>
                {selectedVehicle.registration_no}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              {selectedVehicle.year} &bull; {selectedVehicle.fuel_type} &bull; {selectedVehicle.usage_pattern} Profile &bull; Current Odometer: <strong style={{ color: '#f8fafc' }}>{selectedVehicle.odometer_km.toLocaleString()} km</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Health</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
              {healthData ? Math.round(healthData.health_score) : 92}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/100</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={onRunPrediction}
            disabled={predicting}
            style={{ padding: '0.75rem 1.5rem' }}
          >
            {predicting ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {predicting ? 'Evaluating ML Pipeline...' : 'Run AI Prediction'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['All', 'Urgent', 'Engine', 'Braking', 'Fluids', 'Electrical', 'Chassis'].map(cat => (
          <button
            key={cat}
            className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilterCategory(cat)}
          >
            {cat} {cat === 'All' ? `(${predictions.length})` : ''}
          </button>
        ))}
      </div>

      {/* Component Risk Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Component Risk & Wear Breakdown
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            ML Model: XGBoost Classifier (88.5% Accuracy) + RUL Regressor
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>COMPONENT</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>CATEGORY</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>AI RECOMMENDATION</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>WEAR / RISK SCORE</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>RISK LEVEL</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>REMAINING USEFUL LIFE</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.map((pred) => {
                const barColor = getProgressBarColor(pred.risk_score);
                return (
                  <tr 
                    key={pred.component_id}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#f8fafc' }}>
                      {pred.component_name}
                    </td>

                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.78rem' }}>
                        {pred.category}
                      </span>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      {getRecommendationBadge(pred.recommendation)}
                    </td>

                    <td style={{ padding: '1rem', minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              width: `${pred.risk_score}%`, 
                              height: '100%', 
                              backgroundColor: barColor,
                              borderRadius: '4px',
                              boxShadow: `0 0 8px ${barColor}88`
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: barColor, width: '38px', textAlign: 'right' }}>
                          {pred.risk_score}%
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <span className={`badge badge-${pred.risk_level.toLowerCase()}`}>
                        {pred.risk_level}
                      </span>
                    </td>

                    <td style={{ padding: '1rem', fontWeight: 600, color: pred.remaining_useful_life_km < 3000 ? '#ef4444' : '#f8fafc' }}>
                      {pred.remaining_useful_life_km.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>km</span>
                    </td>

                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedCompModal(pred)}
                      >
                        <Info size={14} /> Probabilities
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Component Probabilities Modal */}
      {selectedCompModal && (
        <div className="modal-backdrop" onClick={() => setSelectedCompModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                  ML Classification Output
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                  {selectedCompModal.component_name}
                </h3>
              </div>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedCompModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="glass-card">
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Predicted Recommendation</span>
                <div style={{ marginTop: '4px' }}>
                  {getRecommendationBadge(selectedCompModal.recommendation)}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Model Decision Probabilities:
                </h4>
                {selectedCompModal.probabilities && Object.entries(selectedCompModal.probabilities).map(([label, prob]) => {
                  const pct = Math.round(prob * 100);
                  return (
                    <div key={label} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '4px' }}>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{label}</span>
                        <span style={{ color: '#38bdf8', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => setSelectedCompModal(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
