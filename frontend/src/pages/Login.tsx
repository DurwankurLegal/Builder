import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import { useUIStore } from '../store/uiStore';
import { apiClient } from '../config/api';

export const Login = () => {
  const { login } = useAuthStore();
  const { activeTenantId, setActiveTenant } = useTenantStore();
  const { showToast } = useUIStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
        tenant_code: activeTenantId
      }, {
        headers: {
          'X-Tenant-ID': activeTenantId
        }
      });
      
      const { access_token, user } = response.data;
      login(access_token, user);
      showToast(`Welcome back, ${user.username}!`, 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication session failed.");
      showToast("Incorrect login details", 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)' }}>
      <div className="card" style={{ width: '400px', padding: 'var(--spacing-8)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
          <div style={{ backgroundColor: 'var(--brand-primary)', borderRadius: 'var(--radius-md)', width: '48px', height: '48px', margin: '0 auto var(--spacing-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
            B
          </div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-main)' }}>Sign In to Builder CRM</h2>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Enterprise multi-tenant portal credentials</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-3)', color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-4)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
            <label className="form-label">Active Workspace</label>
            <select 
              className="form-control" 
              value={activeTenantId} 
              onChange={(e) => {
                const val = e.target.value;
                const nameMap: Record<string, string> = {
                  'tenant-1': 'Prestige Group',
                  'tenant-2': 'DLF Limited',
                  'tenant-3': 'LODHA Group',
                  'tenant-4': 'Sobha Developers',
                  'tenant-5': 'Godrej Properties'
                };
                setActiveTenant(val, nameMap[val]);
              }}
              style={{ width: '100%', cursor: 'pointer' }}
            >
              <option value="tenant-1">Prestige Group</option>
              <option value="tenant-2">DLF Limited</option>
              <option value="tenant-3">LODHA Group</option>
              <option value="tenant-4">Sobha Developers</option>
              <option value="tenant-5">Godrej Properties</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-control" 
              required 
              placeholder="e.g. admin" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--spacing-6)' }}>
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              required 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: 'var(--spacing-3)', fontWeight: 'var(--font-weight-semibold)' }}
          >
            {loading ? 'Authenticating...' : 'Secure Log In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--spacing-6)', fontSize: '11px', color: 'var(--text-muted)' }}>
          Tip: Seeding creates admin account: <b>admin</b> / <b>admin</b>
        </div>
      </div>
    </div>
  );
};
