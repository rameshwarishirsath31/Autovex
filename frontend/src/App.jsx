import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import VehicleDetailView from './components/VehicleDetailView';
import LiveOBDView from './components/LiveOBDView';
import MaintenanceHistoryView from './components/MaintenanceHistoryView';
import RemindersView from './components/RemindersView';
import ReportsView from './components/ReportsView';
import LoginModal from './components/LoginModal';
import { 
  authApi, 
  vehicleApi, 
  predictionApi, 
  obdApi, 
  reminderApi, 
  getToken, 
  removeToken 
} from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [predictionSummary, setPredictionSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [dtcCodes, setDtcCodes] = useState([]);
  const [simActive, setSimActive] = useState(false);
  const [predicting, setPredicting] = useState(false);

  // Check auth on initial load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setShowLoginModal(true);
    } else {
      authApi.getMe()
        .then(u => {
          setUser(u);
          setShowLoginModal(false);
        })
        .catch(() => {
          removeToken();
          setShowLoginModal(true);
        });
    }
  }, []);

  // Fetch Vehicles
  const loadVehicles = async () => {
    try {
      const vList = await vehicleApi.getAll();
      setVehicles(vList);
      if (vList.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(vList[0].id);
      }
    } catch (e) {
      console.error('Failed to load vehicles:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadVehicles();
    }
  }, [user]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

  // Fetch Vehicle-Specific Data (Health, Predictions, DTCs, Reminders, Sim status)
  const loadVehicleDiagnostics = async () => {
    if (!selectedVehicle) return;

    try {
      const [hData, pSummary, dtcs, rems, sim] = await Promise.all([
        vehicleApi.getHealthScore(selectedVehicle.id).catch(() => null),
        predictionApi.getLatest(selectedVehicle.id).catch(() => null),
        vehicleApi.getDTC(selectedVehicle.id).catch(() => []),
        reminderApi.getAll(selectedVehicle.id).catch(() => []),
        obdApi.getSimStatus(selectedVehicle.id).catch(() => ({ simulating: false }))
      ]);

      setHealthData(hData);
      setPredictionSummary(pSummary);
      if (pSummary && pSummary.predictions) {
        setPredictions(pSummary.predictions);
      }
      setDtcCodes(dtcs || []);
      setReminders(rems || []);
      setSimActive(sim ? sim.simulating : false);
    } catch (e) {
      console.error('Error loading vehicle diagnostics:', e);
    }
  };

  useEffect(() => {
    if (selectedVehicle) {
      loadVehicleDiagnostics();
    }
  }, [selectedVehicleId, vehicles]);

  // Run ML Prediction on Demand
  const handleRunPrediction = async () => {
    if (!selectedVehicle) return;
    setPredicting(true);
    try {
      const summary = await predictionApi.run(selectedVehicle.id);
      setPredictionSummary(summary);
      if (summary && summary.predictions) {
        setPredictions(summary.predictions);
      }
      const hData = await vehicleApi.getHealthScore(selectedVehicle.id);
      setHealthData(hData);
    } catch (e) {
      alert('Prediction run failed: ' + e.message);
    } finally {
      setPredicting(false);
    }
  };

  // Toggle OBD Simulator
  const handleToggleSim = async () => {
    if (!selectedVehicle) return;
    try {
      if (simActive) {
        await obdApi.stopSim(selectedVehicle.id);
        setSimActive(false);
      } else {
        await obdApi.startSim(selectedVehicle.id);
        setSimActive(true);
      }
    } catch (e) {
      alert('Simulator toggle failed: ' + e.message);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setShowLoginModal(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        setSelectedVehicleId={setSelectedVehicleId}
        user={user}
        onLogout={handleLogout}
      />

      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '1.75rem 1.5rem 3rem 1.5rem', flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardView
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={(id) => { setSelectedVehicleId(id); setActiveTab('vehicle-detail'); }}
            healthData={healthData}
            predictionSummary={predictionSummary}
            reminders={reminders}
            dtcCodes={dtcCodes}
            simActive={simActive}
            onToggleSim={handleToggleSim}
            onRunPrediction={handleRunPrediction}
            predicting={predicting}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'vehicle-detail' && (
          <VehicleDetailView
            selectedVehicle={selectedVehicle}
            predictions={predictions}
            healthData={healthData}
            onRunPrediction={handleRunPrediction}
            predicting={predicting}
          />
        )}

        {activeTab === 'live-obd' && (
          <LiveOBDView
            selectedVehicle={selectedVehicle}
            simActive={simActive}
            onToggleSim={handleToggleSim}
          />
        )}

        {activeTab === 'history' && (
          <MaintenanceHistoryView
            selectedVehicle={selectedVehicle}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersView
            selectedVehicle={selectedVehicle}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            selectedVehicle={selectedVehicle}
          />
        )}
      </main>

      <LoginModal
        isOpen={showLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
