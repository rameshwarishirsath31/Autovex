import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Calendar,
  Layers,
  FileSpreadsheet
} from 'lucide-react';
import { reportApi } from '../api';

export default function ReportsView({ selectedVehicle }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedVehicle) return;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await reportApi.getSummary(selectedVehicle.id);
        setReport(data);
      } catch (e) {
        console.error('Error fetching report:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedVehicle]);

  if (!selectedVehicle) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Please select a vehicle to generate diagnostic reports.</p>
      </div>
    );
  }

  const exportUrl = reportApi.getExportUrl(selectedVehicle.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc' }}>
              Vehicle Health & Compliance Report
            </h2>
            <span className="badge badge-inspect">{selectedVehicle.registration_no}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Official predictive maintenance diagnostics summary for fleet managers and workshops.
          </p>
        </div>

        <a 
          href={exportUrl} 
          download 
          className="btn btn-emerald"
          style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}
        >
          <FileSpreadsheet size={18} /> Export CSV Diagnostics
        </a>
      </div>

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Executive Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Vehicle Score</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                {Math.round(report.health.health_score)}/100
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Grade: {report.health.grade} ({report.health.status})
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Past Service Visits</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {report.metrics.total_service_records}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Total recorded workshops
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Active Fault Codes</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: report.metrics.active_dtc_count > 0 ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                {report.metrics.active_dtc_count}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                OBD-II ECU fault alerts
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pending Reminders</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                {report.metrics.pending_reminders_count}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Scheduled service tasks
              </div>
            </div>
          </div>

          {/* Breakdown by Recommendation Status */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Component Recommendation Distribution (11 Monitored Parts)
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Monitor (Optimal)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {report.metrics.recommendation_breakdown.Monitor || 0}
                </div>
              </div>

              <div className="glass-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Inspect (Advisory)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {report.metrics.recommendation_breakdown.Inspect || 0}
                </div>
              </div>

              <div className="glass-card" style={{ borderLeft: '4px solid #f97316' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Service (Action Required)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316', marginTop: '4px' }}>
                  {report.metrics.recommendation_breakdown.Service || 0}
                </div>
              </div>

              <div className="glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Replace (Critical Limit)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                  {report.metrics.recommendation_breakdown.Replace || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
            <span>Report Generated: {new Date(report.generated_at).toLocaleString()}</span>
            <span>AUTOVEX Machine Learning Diagnostic Engine &bull; ISO-15765 Certified Simulator</span>
          </div>
        </div>
      )}
    </div>
  );
}
