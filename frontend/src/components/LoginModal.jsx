import React, { useState } from 'react';
import { Cpu, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { authApi, setToken } from '../api';

export default function LoginModal({ isOpen, onSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@autovex.com');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let data;
      if (isRegister) {
        data = await authApi.register(name, email, password);
      } else {
        data = await authApi.login(email, password);
      }

      setToken(data.access_token);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCreds = (userType) => {
    setError('');
    if (userType === 'demo') {
      setEmail('demo@autovex.com');
      setPassword('demo123');
    } else {
      setEmail('admin@autovex.com');
      setPassword('admin123');
    }
    setIsRegister(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px', padding: '2.25rem' }}>
        {/* Header with Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem auto',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
          }}>
            <Cpu size={26} color="#ffffff" />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            AUTO<span style={{ color: '#06b6d4' }}>VEX</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Automotive AI Predictive Maintenance Cockpit
          </p>
        </div>

        {/* Quick Demo Credentials Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCreds('demo')}
            style={{ fontSize: '0.78rem' }}
          >
            Auto-fill Demo User
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setDemoCreds('admin')}
            style={{ fontSize: '0.78rem' }}
          >
            Auto-fill Admin
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.82rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Email Address
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="demo@autovex.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : (isRegister ? 'Register Account' : 'Sign In to Cockpit')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#94a3b8' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
