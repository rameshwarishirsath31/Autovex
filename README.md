# AUTOVEX - Automotive Vehicle Health & EXpert Intelligence
### AI-Based Predictive Vehicle Maintenance & Live Telemetry Cockpit
*Final Year B.Tech Project in Information Technology*

---

## 🚀 Quick Links & Demo Credentials

| Service | Local URL | Description |
| :--- | :--- | :--- |
| **Frontend Cockpit** | [http://localhost:5173](http://localhost:5173) | Interactive React + Vite Dashboard & Telemetry Cockpit |
| **FastAPI Backend Root** | [http://localhost:8000](http://localhost:8000) | Core Service & API Gateway |
| **Interactive Swagger Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Complete OpenAPI Swagger UI |
| **ReDoc Documentation** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Alternate API Reference |
| **Health Check Endpoint** | [http://localhost:8000/health](http://localhost:8000/health) | System & PostgreSQL Connection Status |
| **WebSocket CAN-Bus Feed** | `ws://localhost:8000/ws/obd/{vehicle_id}` | Live 2 Hz ISO-15765-4 OBD-II Stream |
| **PostgreSQL Database** | `localhost:5432` | Database: `autovex_db` |

### 🔑 Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@autovex.com` | `admin123` | Full access across all vehicles and users |
| **Vehicle Owner** | `demo@autovex.com` | `demo123` | Standard access to 3 demo vehicles and telemetry |

---

## 🌟 Project Overview

**AUTOVEX** is an intelligent, full-stack vehicle health monitoring and predictive maintenance platform. Modern connected vehicles generate thousands of diagnostic signals across the CAN-bus network, yet traditional maintenance remains reactive (fixed schedules or breakdowns). AUTOVEX bridges this gap by:

1. **Continuous Telemetry Tracking**: Ingests high-frequency OBD-II readings (Engine RPM, Speed, Coolant Temp, Throttle Position, Engine Load, Battery Voltage, Fuel Level) and ECU Diagnostic Trouble Codes (DTCs).
2. **AI Wear Prediction**: Evaluates 11 critical components per vehicle using trained machine learning classifiers and regressors.
3. **Actionable Recommendations**: Classifies component urgency into **Monitor** (Normal), **Inspect** (Advisory), **Service** (Urgent), and **Replace** (Critical Limit).
4. **Remaining Useful Life (RUL)**: Regresses remaining operating kilometers before physical failure.
5. **Holistic Health Scoring**: Synthesizes weighted component wear and active fault codes into an intuitive 0–100 Vehicle Health Score with academic grading (Grade A to F).
6. **Maintenance & Schedule Ledger**: Tracks historic workshop invoices, component replacements, and forecasts upcoming budget requirements.

---

## 🏗️ System Architecture

```
                                  +-----------------------------+
                                  |     React 18 + Vite UI      |
                                  |    (Cockpit, Gauges, DTC)   |
                                  +--------------+--------------+
                                                 | HTTP / WS (Port 5173 -> 8000)
                                                 v
+-----------------------------------------------------------------------------------------+
|                               FastAPI REST & WebSocket Gateway                           |
|  +--------------------+   +-----------------------+   +------------------------------+  |
|  |   Auth & Security  |   |   Vehicles & Ledger   |   |   OBD Telemetry & Sim Loop   |  |
|  |    (JWT, Bcrypt)   |   |   (CRUD, DTCs, Hist)  |   |   (ISO-15765-4 Broadcast)    |  |
|  +--------------------+   +-----------------------+   +------------------------------+  |
|  +-----------------------------------------------------------------------------------+  |
|  |                              Machine Learning Engine                              |  |
|  |     XGBoost Classifier (88.5% F1)  +  Random Forest RUL Regressor (R² = 0.97)     |  |
|  +-----------------------------------------------------------------------------------+  |
+--------------------------------------------+--------------------------------------------+
                                             | SQLAlchemy 2.0 ORM
                                             v
                              +------------------------------+
                              |   PostgreSQL (autovex_db)    |
                              |   11 Components, 8 Tables    |
                              +------------------------------+
```

---

## 📊 Monitored Vehicle Components (11 Parts)

| Component | Category | Default Interval (km) | Default Horizon (Months) |
| :--- | :--- | :--- | :--- |
| **Engine Oil** | Fluids | 10,000 km | 6 months |
| **Oil Filter** | Engine | 10,000 km | 6 months |
| **Air Filter** | Engine | 15,000 km | 12 months |
| **Brake Pads** | Braking | 30,000 km | 24 months |
| **Brake Fluid** | Fluids | 40,000 km | 24 months |
| **Battery** | Electrical | 50,000 km | 36 months |
| **Tires** | Chassis | 45,000 km | 36 months |
| **Spark Plugs** | Electrical | 30,000 km | 24 months |
| **Coolant** | Fluids | 40,000 km | 24 months |
| **Clutch/Transmission Fluid** | Fluids | 50,000 km | 36 months |
| **Timing Belt** | Engine | 80,000 km | 60 months |

---

## 🤖 Machine Learning Model Benchmarks

Trained on 22,000 synthetic driving cycles combining vehicle age, odometer, wear ratios, telemetry stress, harsh braking metrics, and active ECU fault codes.

| Classifier Model | Accuracy | Precision | Recall | F1-Score |
| :--- | :--- | :--- | :--- | :--- |
| **Decision Tree** | 83.50% | 83.59% | 83.50% | 0.8351 |
| **Random Forest** | 85.05% | 84.55% | 85.05% | 0.8389 |
| **XGBoost (Selected)** | **88.50%** | **88.28%** | **88.50%** | **0.8834** |

- **Remaining Useful Life (RUL) Regressor**: Random Forest Regressor achieving **$R^2 = 0.9702$** and Mean Absolute Error (MAE) of **1,114 km**.
- Stored Artifacts:
  - `backend/ml/models/best_classifier.joblib`
  - `backend/ml/models/rul_regressor.joblib`
  - `backend/ml/models/preprocessor.joblib`
  - `backend/ml/models/confusion_matrix.png`
  - `backend/ml/models/feature_importance.png`

---

## 🛠️ Setup & Execution Guide

### 1. Database Setup (PostgreSQL)

#### Option A: Docker Compose (Recommended)
```bash
docker-compose up -d
```

#### Option B: Local PostgreSQL Installation
Ensure PostgreSQL is running locally on port 5432:
```sql
CREATE DATABASE autovex_db;
```
Configure your connection string in `backend/.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/autovex_db
```

### 2. Backend Setup & Model Training

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows)
.venv\Scripts\activate
# Activate virtual environment (Linux/macOS)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Generate synthetic dataset and train models
python ml/train_model.py

# Seed database with demo vehicles and telemetry
python seed_db.py

# Run unit tests
pytest tests -v

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install node packages
npm install

# Start Vite development server
npm run dev
```

### 4. One-Click Launch (Windows / Linux)
- On Windows: Run `run_all.bat`
- On Linux/macOS: Run `chmod +x run_all.sh && ./run_all.sh`

---

## 🔮 Future Scope & Production Roadmap

1. **Hardware Integration (ELM327 / STN1110)**: Bluetooth and USB ELM327 adapter integration with `python-obd` for live physical vehicle testing.
2. **TimescaleDB Extension**: High-throughput time-series compression for continuous sub-second CAN-bus sensor telemetry.
3. **GIS Service Center Recommendation**: Integration with Google Maps Platform / Mapbox to locate nearby accredited service bays when replacement is flagged.
4. **Automated Driver Alerts**: SMS (Twilio) and Email (SendGrid) service dispatch notifications when critical DTC codes or brake wear exceed safety limits.
