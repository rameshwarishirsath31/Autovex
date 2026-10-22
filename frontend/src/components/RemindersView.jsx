import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  DollarSign, 
  Check, 
  Plus, 
  Trash2, 
  X,
  ShieldAlert
} from 'lucide-react';
import { reminderApi, vehicleApi } from '../api';

export default function RemindersView({ selectedVehicle }) {
  const [schedule, setSchedule] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    message: '',
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    due_km: selectedVehicle ? selectedVehicle.odometer_km + 3000 : 40000
  });

  const fetchData = async () => {
    if (!selectedVehicle) return;
    setLoading(true);
    try {
      const [sched, rems] = await Promise.all([
        vehicleApi.getSchedule(selectedVehicle.id),
        reminderApi.getAll(selectedVehicle.id)
      ]);
      setSchedule(sched);
      setReminders(rems);
    } catch (e) {
      console.error('Error fetching schedule/reminders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedVehicle]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await reminderApi.update(id, { status });
      setReminders(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (e) {
      alert('Failed to update reminder: ' + e.message);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      await reminderApi.create(selectedVehicle.id, {
        ...newReminder,
        due_km: parseFloat(newReminder.due_km)
      });
      setShowAddReminderModal(false);
      setNewReminder({
        message: '',
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        due_km: selectedVehicle ? selectedVehicle.odometer_km + 3000 : 40000
      });
      fetchData();
    } catch (e) {
      alert('Failed to create reminder: ' + e.message);
    }
  };

  if (!selectedVehicle) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Please select a vehicle to view maintenance schedules and service alerts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc' }}>
              Service Schedule & Predictive Reminders
            </h2>
            <span className="badge badge-inspect">{selectedVehicle.registration_no}</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Machine learning forecast of milestone inspections and replacement budget requirements.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowAddReminderModal(true)}
        >
          <Plus size={16} /> Add Custom Reminder
        </button>
      </div>

      {/* Schedule Summary Cards */}
      {schedule && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Next Milestone Horizon</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
              {Math.round(schedule.next_service_km).toLocaleString()} <span style={{ fontSize: '1rem', color: '#64748b' }}>km</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
              Current Odometer: {Math.round(schedule.current_odometer_km).toLocaleString()} km
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Maintenance Budget</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>
              ${schedule.estimated_total_cost.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
              Projected OEM parts & fluids cost for upcoming services
            </div>
          </div>
        </div>
      )}

      {/* Recommended Service Schedule Items */}
      {schedule && schedule.items && schedule.items.length > 0 && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              AI Predicted Upcoming Service Milestones
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#94a3b8', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>COMPONENT</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>DUE AT MILEAGE</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>ESTIMATED DATE</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>URGENCY</th>
                  <th style={{ padding: '1rem', fontWeight: 600 }}>DIAGNOSTIC REASON</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>EST. COST</th>
                </tr>
              </thead>
              <tbody>
                {schedule.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem 1.5rem', color: '#f8fafc', fontWeight: 700 }}>
                      {item.component_name}
                    </td>
                    <td style={{ padding: '1rem', color: '#38bdf8', fontWeight: 600 }}>
                      {Math.round(item.due_km).toLocaleString()} km
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8' }}>
                      {item.due_date || 'Calculated on usage'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${item.urgency === 'Critical' ? 'badge-replace' : (item.urgency === 'High' ? 'badge-service' : 'badge-monitor')}`}>
                        {item.urgency}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#94a3b8', maxWidth: '280px' }}>
                      {item.reason}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: '#10b981', fontWeight: 700, textAlign: 'right' }}>
                      ${item.estimated_cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Reminders List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>
          Active Notifications & User Reminders ({reminders.length})
        </h3>

        {reminders.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No reminders currently scheduled.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reminders.map((rem) => {
              const isCompleted = rem.status === 'Completed';
              return (
                <div 
                  key={rem.id} 
                  className="glass-card"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: isCompleted ? 0.6 : 1,
                    textDecoration: isCompleted ? 'line-through' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isCompleted ? '#10b981' : '#f59e0b'
                    }}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc' }}>
                        {rem.message}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {rem.due_date ? `Due by ${rem.due_date}` : ''} {rem.due_km ? `or at ${rem.due_km.toLocaleString()} km` : ''} &bull; Status: <strong style={{ color: isCompleted ? '#10b981' : '#38bdf8' }}>{rem.status}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isCompleted ? (
                      <button
                        className="btn btn-emerald btn-sm"
                        onClick={() => handleUpdateStatus(rem.id, 'Completed')}
                      >
                        <Check size={14} /> Mark Done
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleUpdateStatus(rem.id, 'Pending')}
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showAddReminderModal && (
        <div className="modal-backdrop" onClick={() => setShowAddReminderModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                Create Service Alert
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddReminderModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Reminder Message
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Schedule brake rotor inspection"
                  value={newReminder.message}
                  onChange={e => setNewReminder({ ...newReminder, message: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={newReminder.due_date}
                  onChange={e => setNewReminder({ ...newReminder, due_date: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                  Due Odometer (km)
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={newReminder.due_km}
                  onChange={e => setNewReminder({ ...newReminder, due_km: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddReminderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
