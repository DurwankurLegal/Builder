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
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const navigate = useNavigate();

  const handleForcedPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.post('/auth/change-password', {
        current_password: password,
        new_password: newPassword,
      });
      showToast('Password updated. Welcome aboard!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Password change failed.');
    } finally {
      setLoading(false);
    }
  };

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
      
      const { access_token, user, force_password_change } = response.data;
      login(access_token, user);

      if (force_password_change) {
        // Administrator required a password change before the account is usable
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

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

        {mustChangePassword ? (
          <form onSubmit={handleForcedPasswordChange}>
            <div style={{ backgroundColor: 'var(--color-warning-bg, var(--bg-muted))', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-3)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-4)' }}>
              Your administrator requires you to set a new password before continuing.
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
              <label className="form-label">New Password</label>
              <input type="password" name="newPassword" className="form-control" required minLength={8}
                placeholder="At least 8 characters" style={{ width: '100%' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--spacing-6)' }}>
              <label className="form-label">Confirm New Password</label>
              <input type="password" name="confirmPassword" className="form-control" required minLength={8}
                placeholder="Re-enter new password" style={{ width: '100%' }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: '100%', padding: 'var(--spacing-3)', fontWeight: 'var(--font-weight-semibold)' }}>
              {loading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
        ) : (
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
        )}

        {!mustChangePassword && (
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-6)', fontSize: '11px', color: 'var(--text-muted)' }}>
            Tip: Seeding creates admin account: <b>admin</b> / <b>admin</b>
          </div>
        )}
      </div>
    </div>
  );
};
