import urllib.request
import json

# 1. Login
req = urllib.request.Request(
    'http://localhost:8000/auth/login',
    data=json.dumps({'email': 'demo@autovex.com', 'password': 'demo123'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
res = urllib.request.urlopen(req)
login_data = json.loads(res.read().decode('utf-8'))
token = login_data['access_token']
print('Login Success! User:', login_data['user']['name'], f"({login_data['user']['email']})")

# 2. Get Vehicles
req_v = urllib.request.Request(
    'http://localhost:8000/vehicles',
    headers={'Authorization': f'Bearer {token}'}
)
vehicles = json.loads(urllib.request.urlopen(req_v).read().decode('utf-8'))
print(f'Retrieved {len(vehicles)} fleet vehicles:')
for v in vehicles:
    print(f"  - [{v['id']}] {v['make']} {v['model']} ({v['registration_no']}) | Odometer: {v['odometer_km']:,} km")

# 3. Run Predictions on Vehicle 1
v1_id = vehicles[0]['id']
req_p = urllib.request.Request(
    f'http://localhost:8000/predictions/{v1_id}/run',
    data=b'',
    headers={'Authorization': f'Bearer {token}'}
)
pred_summary = json.loads(urllib.request.urlopen(req_p).read().decode('utf-8'))
print(f"\nAI Predictions for {vehicles[0]['make']} {vehicles[0]['model']}:")
print(f"  Overall Health Score: {pred_summary['overall_health_score']:.1f}/100 ({pred_summary['overall_risk_level']} Risk)")
print(f"  Components Evaluated: {len(pred_summary['predictions'])}")
for p in pred_summary['predictions'][:4]:
    print(f"   * {p['component_name']}: {p['recommendation']} (Risk: {p['risk_score']}%, RUL: {p['remaining_useful_life_km']:,} km)")

# 4. Simulation Start / Stop
req_sim = urllib.request.Request(f'http://localhost:8000/obd/{v1_id}/simulate/start', data=b'', headers={'Authorization': f'Bearer {token}'})
sim_res = json.loads(urllib.request.urlopen(req_sim).read().decode('utf-8'))
print(f"\nOBD Simulator: {sim_res['message']}")

req_stop = urllib.request.Request(f'http://localhost:8000/obd/{v1_id}/simulate/stop', data=b'', headers={'Authorization': f'Bearer {token}'})
stop_res = json.loads(urllib.request.urlopen(req_stop).read().decode('utf-8'))
print(f"OBD Simulator: {stop_res['message']}")
