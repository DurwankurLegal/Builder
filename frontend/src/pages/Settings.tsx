import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import {
  Building2, HardHat, ShieldCheck, Share2, Plus, Trash2, XCircle, ExternalLink
} from 'lucide-react';

interface ProjectRow { id: string; name: string; location: string; rera: string; units: number; }
interface ChannelRow { name: string; enabled: boolean; }
interface CompanyProfile { legal_name?: string; rera_id?: string; cin?: string; gstin?: string; address?: string; }

export const Settings = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { userInfo } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = ['Super Admin', 'Tenant Admin'].includes(userInfo?.role || '');

  const [activeTab, setActiveTab] = useState<'company' | 'projects' | 'executives' | 'channels'>('company');
  const [company, setCompany] = useState<CompanyProfile>({});
  const [showAddProject, setShowAddProject] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['workspace-settings'],
    queryFn: async () => (await apiClient.get('/settings/workspace')).data
  });

  // Company form state follows the loaded settings
  useEffect(() => {
    if (settings?.company) setCompany(settings.company);
  }, [settings]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/users')).data,
    enabled: isAdmin && activeTab === 'executives'
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => (await apiClient.put('/settings/workspace', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-settings'] });
      showToast('Workspace settings saved.', 'success');
      setShowAddProject(false);
    },
    onError: (err: any) => showToast(
      err?.response?.status === 403
        ? 'Only workspace administrators can change settings.'
        : (err?.response?.data?.detail || 'Saving settings failed.'), 'danger')
  });

  const projects: ProjectRow[] = settings?.projects || [];
  const channels: ChannelRow[] = settings?.channels || [];

  const saveCompany = () => saveMutation.mutate({ company });

  const addProject = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const newProject: ProjectRow = {
      id: `${Date.now()}`,
      name: (form.elements.namedItem('projName') as HTMLInputElement).value.trim(),
      location: (form.elements.namedItem('projLocation') as HTMLInputElement).value.trim(),
      rera: (form.elements.namedItem('projRera') as HTMLInputElement).value.trim(),
      units: parseInt((form.elements.namedItem('projUnits') as HTMLInputElement).value, 10) || 0,
    };
    saveMutation.mutate({ projects: [...projects, newProject] });
  };

  const deleteProject = (id: string) => {
    saveMutation.mutate({ projects: projects.filter(p => p.id !== id) });
  };

  const toggleChannel = (index: number) => {
    const updated = channels.map((c, i) => i === index ? { ...c, enabled: !c.enabled } : c);
    saveMutation.mutate({ channels: updated });
  };

  const tabButton = (key: typeof activeTab, icon: JSX.Element, label: string) => (
    <button className={`nav-link ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
      {icon} {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-6)' }}>
      {/* Settings Navigation Menu */}
      <div className="card" style={{ width: '240px', padding: 'var(--spacing-2) 0', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        {tabButton('company', <Building2 size={16} />, 'Company Profile')}
        {tabButton('projects', <HardHat size={16} />, 'Projects Directory')}
        {isAdmin && tabButton('executives', <ShieldCheck size={16} />, 'Sales Executives')}
        {tabButton('channels', <Share2 size={16} />, 'Lead Channels')}
      </div>

      {/* Settings Content Area */}
      <div style={{ flex: 1 }}>
        {isLoading && <div className="card" style={{ color: 'var(--text-muted)' }}>Loading workspace settings...</div>}

        {!isLoading && activeTab === 'company' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Company Corporate Profile</h3>
            {!isAdmin && (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Read-only — contact a workspace administrator to change these details.
              </p>
            )}
            <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Developer Legal Name</label>
                <input type="text" className="form-control" disabled={!isAdmin} value={company.legal_name || ''}
                  onChange={e => setCompany({ ...company, legal_name: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">RERA Registration ID</label>
                <input type="text" className="form-control" disabled={!isAdmin} value={company.rera_id || ''}
                  onChange={e => setCompany({ ...company, rera_id: e.target.value })} style={{ width: '100%' }} />
              </div>
            </div>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CIN (Corporate ID Number)</label>
                <input type="text" className="form-control" disabled={!isAdmin} value={company.cin || ''}
                  onChange={e => setCompany({ ...company, cin: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Corporate GSTIN</label>
                <input type="text" className="form-control" disabled={!isAdmin} value={company.gstin || ''}
                  onChange={e => setCompany({ ...company, gstin: e.target.value })} style={{ width: '100%' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Headquarters Office Address</label>
              <input type="text" className="form-control" disabled={!isAdmin} value={company.address || ''}
                onChange={e => setCompany({ ...company, address: e.target.value })} style={{ width: '100%' }} />
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={saveCompany} disabled={saveMutation.isPending}
                style={{ width: 'fit-content', marginTop: 'var(--spacing-2)' }}>
                {saveMutation.isPending ? 'Saving...' : 'Save Company Profile'}
              </button>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'projects' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Active Projects Masters Directory</h3>
              {isAdmin && (
                <button className="btn btn-outline" onClick={() => setShowAddProject(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={14} /> Add Project
                </button>
              )}
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Location Area</th>
                    <th>RERA Certification No</th>
                    <th>Active Units</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', padding: 'var(--spacing-6)', color: 'var(--text-muted)' }}>No projects registered.</td></tr>
                  ) : projects.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.location}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.rera}</td>
                      <td>{p.units}</td>
                      {isAdmin && (
                        <td>
                          <button className="btn btn-outline-danger" onClick={() => deleteProject(p.id)} style={{ padding: '4px 8px' }} aria-label={`Remove ${p.name}`}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && activeTab === 'executives' && isAdmin && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Sales team accounts</h3>
              <button className="btn btn-outline" onClick={() => navigate('/users')} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ExternalLink size={14} /> Manage in User Management
              </button>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
              Accounts are managed centrally in User Management — this view mirrors the live directory.
            </p>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Corporate Email ID</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={`badge ${u.is_locked ? 'badge-danger' : u.is_active ? 'badge-success' : 'badge-warning'}`}>
                          {u.is_locked ? 'Locked' : u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && activeTab === 'channels' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Lead Inbound Channels Configurations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
              {channels.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 'bold' }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.enabled ? 'Capture Enabled' : 'Deactivated'}</span>
                    <input type="checkbox" checked={c.enabled} disabled={!isAdmin || saveMutation.isPending}
                      onChange={() => toggleChannel(i)} style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', width: '16px', height: '16px' }}
                      aria-label={`Toggle ${c.name}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddProject && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Register New Project</h3>
            <button className="dialog-close" onClick={() => setShowAddProject(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={addProject}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input type="text" name="projName" className="form-control" style={{ width: '100%' }} required minLength={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Location Area</label>
                <input type="text" name="projLocation" className="form-control" style={{ width: '100%' }} required />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">RERA Certification No</label>
                  <input type="text" name="projRera" className="form-control" style={{ width: '100%' }} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Units</label>
                  <input type="number" name="projUnits" className="form-control" style={{ width: '100%' }} min={1} required />
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddProject(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Add Project'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
export default Settings;
