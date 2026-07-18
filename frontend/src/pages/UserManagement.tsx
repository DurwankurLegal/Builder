import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import {
  Plus, XCircle, KeyRound, Lock, Unlock, UserCheck, UserX,
  Edit, ShieldAlert, RefreshCw, Search
} from 'lucide-react';

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  is_locked: boolean;
  force_password_change: boolean;
  failed_login_attempts: number;
  created_at?: string;
  last_login?: string;
}

interface TenantGroup {
  tenant_id: string;
  tenant_name: string;
  users: ManagedUser[];
}

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { userInfo } = useAuthStore();
  const { activeTenantId, activeTenantName } = useTenantStore();

  const isSuperAdmin = userInfo?.role === 'Super Admin';

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [showAllTenants, setShowAllTenants] = useState(false);

  // Users in the ACTIVE workspace. Super Admins change workspace with the
  // top-bar selector; Tenant Admins are locked to their own by the backend.
  const { data: users = [], isLoading } = useQuery<ManagedUser[]>({
    queryKey: ['users', activeTenantId],
    queryFn: async () => (await apiClient.get('/users')).data,
    enabled: !showAllTenants,
  });

  // Super Admin only: every workspace at once
  const { data: allTenants = [] } = useQuery<TenantGroup[]>({
    queryKey: ['users-all-tenants'],
    queryFn: async () => (await apiClient.get('/users/all-tenants')).data,
    enabled: showAllTenants && isSuperAdmin,
  });

  const { data: roles = [] } = useQuery<string[]>({
    queryKey: ['assignable-roles', activeTenantId],
    queryFn: async () => (await apiClient.get('/users/roles')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['users-all-tenants'] });
  };

  const action = (label: string) =>
    useMutation({
      mutationFn: async ({ id, path, body }: { id: number; path: string; body?: any }) =>
        (await apiClient.post(`/users/${id}/${path}`, body ?? {})).data,
      onSuccess: () => { invalidate(); showToast(`${label} successful.`, 'success'); },
      onError: (err: any) => showToast(err?.response?.data?.detail || `${label} failed.`, 'danger'),
    });

  const activateM = action('Activation');
  const deactivateM = action('Deactivation');
  const unlockM = action('Unlock');
  const forceM = action('Force password change');
  const resetM = action('Password reset');

  const createM = useMutation({
    mutationFn: async (body: any) => (await apiClient.post('/users', body)).data,
    onSuccess: () => { invalidate(); showToast('User account created.', 'success'); setShowAddModal(false); },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'User creation failed.', 'danger'),
  });

  const updateM = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) =>
      (await apiClient.put(`/users/${id}`, body)).data,
    onSuccess: () => { invalidate(); showToast('User account updated.', 'success'); setEditUser(null); },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Update failed.', 'danger'),
  });

  const matches = (u: ManagedUser) =>
    !search || `${u.username} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase());

  const statusBadge = (u: ManagedUser) => {
    if (u.is_locked) return <span className="badge badge-danger">Locked</span>;
    if (!u.is_active) return <span className="badge badge-neutral">Deactivated</span>;
    return <span className="badge badge-success">Active</span>;
  };

  const roleBadge = (role: string) => (
    <span className={`badge ${role === 'Super Admin' ? 'badge-danger' : role === 'Tenant Admin' ? 'badge-warning' : 'badge-info'}`}>
      {role}
    </span>
  );

  const renderRows = (list: ManagedUser[], readOnly = false) =>
    list.filter(matches).map(u => (
      <tr key={`${u.id}-${u.username}`}>
        <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{u.username}</td>
        <td style={{ wordBreak: 'break-all' }}>{u.email}</td>
        <td>{roleBadge(u.role)}</td>
        <td>{statusBadge(u)}</td>
        <td>
          {u.force_password_change
            ? <span className="badge badge-warning">Change required</span>
            : <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>—</span>}
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
        </td>
        <td>{u.failed_login_attempts || 0}</td>
        {!readOnly && (
          <td>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" title="Edit details / role" style={{ padding: '4px' }}
                onClick={() => setEditUser(u)}><Edit size={14} /></button>
              <button className="btn btn-ghost" title="Reset password" style={{ padding: '4px' }}
                onClick={() => setResetUser(u)}><KeyRound size={14} /></button>
              {u.is_locked && (
                <button className="btn btn-ghost" title="Unlock account" style={{ padding: '4px', color: 'var(--color-success)' }}
                  onClick={() => unlockM.mutate({ id: u.id, path: 'unlock' })}><Unlock size={14} /></button>
              )}
              {u.is_active ? (
                <button className="btn btn-ghost" title="Deactivate" style={{ padding: '4px', color: 'var(--color-danger)' }}
                  onClick={() => deactivateM.mutate({ id: u.id, path: 'deactivate' })}><UserX size={14} /></button>
              ) : (
                <button className="btn btn-ghost" title="Activate" style={{ padding: '4px', color: 'var(--color-success)' }}
                  onClick={() => activateM.mutate({ id: u.id, path: 'activate' })}><UserCheck size={14} /></button>
              )}
              <button className="btn btn-ghost" title={u.force_password_change ? 'Clear forced password change' : 'Force password change at next login'}
                style={{ padding: '4px' }}
                onClick={() => forceM.mutate({ id: u.id, path: 'force-password-change', body: { force_password_change: !u.force_password_change } })}>
                <Lock size={14} />
              </button>
            </div>
          </td>
        )}
      </tr>
    ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>User Management</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            {isSuperAdmin
              ? 'Super Admin — manage user accounts across all workspaces'
              : `Tenant Admin — manage user accounts within ${activeTenantName}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
          {isSuperAdmin && (
            <button className="btn btn-outline" onClick={() => setShowAllTenants(v => !v)}>
              <RefreshCw size={16} style={{ marginRight: '6px' }} />
              {showAllTenants ? 'View Active Workspace' : 'View All Workspaces'}
            </button>
          )}
          {!showAllTenants && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} style={{ marginRight: '6px' }} /> Add User
            </button>
          )}
        </div>
      </div>

      {/* Scope notice */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', padding: 'var(--spacing-3) var(--spacing-4)' }}>
        <ShieldAlert size={18} style={{ color: 'var(--brand-primary)' }} />
        <div style={{ fontSize: 'var(--font-size-sm)' }}>
          {isSuperAdmin ? (
            <>Operating on <b>{showAllTenants ? 'all workspaces' : activeTenantName}</b>. Switch the workspace in the top bar to manage a different tenant.</>
          ) : (
            <>Your access is restricted to <b>{activeTenantName}</b>. Accounts in other workspaces are not visible or modifiable.</>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input type="text" className="form-control" placeholder="Search username, email, role..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {showAllTenants && isSuperAdmin ? (
        allTenants.map(group => (
          <div key={group.tenant_id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--spacing-3) var(--spacing-4)', borderBottom: '1px solid var(--border-color)', fontWeight: 'var(--font-weight-semibold)' }}>
              {group.tenant_name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({group.users.length} users)</span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th><th>Email</th><th>Role</th><th>Status</th>
                    <th>Password</th><th>Last Login</th><th>Failed</th>
                  </tr>
                </thead>
                <tbody>{renderRows(group.users, true)}</tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th><th>Email</th><th>Role</th><th>Status</th>
                  <th>Password</th><th>Last Login</th><th>Failed</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Loading user accounts...</td></tr>
                ) : users.filter(matches).length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No user accounts matched.</td></tr>
                ) : renderRows(users)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create user */}
      {showAddModal && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Create User Account — {activeTenantName}</h3>
            <button className="dialog-close" onClick={() => setShowAddModal(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            createM.mutate({
              username: (f.elements.namedItem('username') as HTMLInputElement).value,
              email: (f.elements.namedItem('email') as HTMLInputElement).value,
              password: (f.elements.namedItem('password') as HTMLInputElement).value,
              role: (f.elements.namedItem('role') as HTMLSelectElement).value,
              is_active: (f.elements.namedItem('isActive') as HTMLInputElement).checked,
              force_password_change: (f.elements.namedItem('forceChange') as HTMLInputElement).checked,
            });
          }}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input name="username" className="form-control" required minLength={3} style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-control" required style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input name="password" type="password" className="form-control" required minLength={8} style={{ width: '100%' }} />
                <span className="help-text">Minimum 8 characters. Stored hashed — never in plain text.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select name="role" className="form-control" defaultValue="Sales Executive" style={{ width: '100%' }}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="isActive" defaultChecked /> Account active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="forceChange" defaultChecked /> Require password change at first login
              </label>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createM.isPending}>Create Account</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Edit user */}
      {editUser && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Edit User — {editUser.username}</h3>
            <button className="dialog-close" onClick={() => setEditUser(null)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            updateM.mutate({
              id: editUser.id,
              body: {
                email: (f.elements.namedItem('email') as HTMLInputElement).value,
                role: (f.elements.namedItem('role') as HTMLSelectElement).value,
                is_active: (f.elements.namedItem('isActive') as HTMLInputElement).checked,
              }
            });
          }}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input name="email" type="email" className="form-control" defaultValue={editUser.email} required style={{ width: '100%' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select name="role" className="form-control" defaultValue={editUser.role} style={{ width: '100%' }}>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="isActive" defaultChecked={editUser.is_active} /> Account active
              </label>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={updateM.isPending}>Save Changes</button>
            </div>
          </form>
        </dialog>
      )}

      {/* Reset password */}
      {resetUser && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Reset Password — {resetUser.username}</h3>
            <button className="dialog-close" onClick={() => setResetUser(null)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            resetM.mutate({
              id: resetUser.id,
              path: 'reset-password',
              body: {
                new_password: (f.elements.namedItem('newPassword') as HTMLInputElement).value,
                force_password_change: (f.elements.namedItem('forceChange') as HTMLInputElement).checked,
              }
            }, { onSuccess: () => setResetUser(null) });
          }}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input name="newPassword" type="password" className="form-control" required minLength={8} style={{ width: '100%' }} />
                <span className="help-text">Minimum 8 characters. The reset is recorded in the audit log.</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', fontSize: 'var(--font-size-sm)' }}>
                <input type="checkbox" name="forceChange" defaultChecked /> Require password change at next login
              </label>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setResetUser(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={resetM.isPending}>Reset Password</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
