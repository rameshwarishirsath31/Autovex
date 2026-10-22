import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Wrench, 
  Plus, 
  DollarSign, 
  Calendar, 
  CheckCircle,
  X,
  FileCheck
} from 'lucide-react';
import { vehicleApi } from '../api';

export default function MaintenanceHistoryView({ selectedVehicle }) {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [componentHistories, setComponentHistories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newService, setNewService] = useState({
    service_date: new Date().toISOString().split('T')[0],
    odometer_km: selectedVehicle ? selectedVehicle.odometer_km : 0,
    service_type: 'Routine Maintenance',
    cost: 120.0,
    notes: 'Regular periodic inspection & fluid top-up'
  });

  const fetchData = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    try {
      const [svc, comp] = await Promise.all([
        vehicleApi.getServiceRecords(selectedVehicle.id),
        vehicleApi.getComponentHistory(selectedVehicle.id)
      ]);
      setServices(svc);
      setComponentHistories(comp);
    } catch (e) {
      console.error('Error fetching maintenance history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedVehicle]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await vehicleApi.createServiceRecord(selectedVehicle.id, {
        ...newService,
        odometer_km: parseFloat(newService.odometer_km),
        cost: parseFloat(newService.cost)
      });
      setShowAddServiceModal(false);
      fetchData();
    } catch (e) {
      alert('Failed to save service record: ' + e.message);
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Please select a vehicle to inspect historical service logs.</p>
      </div>
    );
  }

  const totalSpent = services.reduce((acc, s) => acc + s.cost, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              Maintenance & Workshop Ledger
            </h2>
            <span className="badge badge-inspect">{selectedVehicle.registration_no}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Complete audit trail of past periodic services, component replacements, and workshop expenses.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Lifetime Service Spend</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowAddServiceModal(true)}
          >
            <Plus size={16} /> Log Workshop Service
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'services' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('services')}
        >
          Periodic Services ({services.length})
        </button>
        <button
          className={`btn ${activeTab === 'components' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('components')}
        >
          Parts Replaced ({componentHistories.length})
        </button>
      </div>

      {/* Services Table */}
      {activeTab === 'services' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>SERVICE DATE</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>ODOMETER</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>SERVICE CATEGORY</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>WORKSHOP NOTES</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>TOTAL COST</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No service records logged yet for this vehicle.
                    </td>
                  </tr>
                ) : (
                  services.map((svc) => (
                    <tr key={svc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem 1.5rem', color: '#f8fafc', fontWeight: 600 }}>
                        {svc.service_date}
                      </td>
                      <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 600 }}>
                        {svc.odometer_km.toLocaleString()} km
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="badge badge-inspect">{svc.service_type}</span>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', maxWidth: '300px' }}>
                        {svc.notes || 'Routine checkup completed'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>
                        ${svc.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Component Replacement History */}
      {activeTab === 'components' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>REPLACED DATE</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>ODOMETER</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>PART SPECIFICATION</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>PART COST</th>
                </tr>
              </thead>
              <tbody>
                {componentHistories.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No component replacement histories logged yet.
                    </td>
                  </tr>
                ) : (
                  componentHistories.map((comp) => (
                    <tr key={comp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '1rem 1.5rem', color: '#f8fafc', fontWeight: 600 }}>
                        {comp.replaced_date}
                      </td>
                      <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 600 }}>
                        {comp.replaced_at_km.toLocaleString()} km
                      </td>
                      <td style={{ padding: '1rem', color: '#f8fafc' }}>
                        <strong>{comp.part_name}</strong>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>
                        ${comp.cost.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Service Record Modal */}
      {showAddServiceModal && (
        <div className="modal-backdrop" onClick={() => setShowAddServiceModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                Log Workshop Service
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddServiceModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Service Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={newService.service_date}
                  onChange={e => setNewService({ ...newService, service_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Odometer at Service (km)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={newService.odometer_km}
                  onChange={e => setNewService({ ...newService, odometer_km: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Service Classification
                </label>
                <select
                  className="form-select"
                  value={newService.service_type}
                  onChange={e => setNewService({ ...newService, service_type: e.target.value })}
                >
                  <option value="Routine Maintenance">Routine Maintenance</option>
                  <option value="Major Service">Major Service</option>
                  <option value="Inspection">Safety & Emissions Inspection</option>
                  <option value="Emergency Repair">Emergency Repair</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Workshop Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={newService.cost}
                  onChange={e => setNewService({ ...newService, cost: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Technician Notes
                </label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={newService.notes}
                  onChange={e => setNewService({ ...newService, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddServiceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
