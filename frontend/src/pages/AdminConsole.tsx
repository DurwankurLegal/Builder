import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { 
  Building2, ShieldAlert, BarChart4, Settings as SettingsIcon, Plus, XCircle, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer 
} from 'recharts';

export const AdminConsole = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'logs' | 'settings'>('overview');

  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [showAddTenant, setShowAddTenant] = useState(false);

  // Queries
  const { data: tenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/tenants');
      return res.data;
    }
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/logs');
      return res.data;
    }
  });

  // DDL tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiClient.post('/admin/tenants', data);
      return res.data;
    },
    onSuccess: (newTenant) => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      showToast(`Workspace schema ${newTenant.name} provisioned successfully!`, 'success');
      setShowAddTenant(false);
    },
    onError: () => {
      showToast('Tenant provisioning failed.', 'danger');
    }
  });

  const handleAddTenantSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const id = (form.elements.namedItem('tenantId') as HTMLInputElement).value;
    const name = (form.elements.namedItem('tenantName') as HTMLInputElement).value;
    const subdomain = (form.elements.namedItem('subdomain') as HTMLInputElement).value;
    const tier = (form.elements.namedItem('tier') as HTMLSelectElement).value;
    const userQuota = parseInt((form.elements.namedItem('userQuota') as HTMLInputElement).value);
    const storageQuota = parseInt((form.elements.namedItem('storageQuota') as HTMLInputElement).value);

    createTenantMutation.mutate({
      id, name, subdomain, tier, userQuota, storageQuota
    });
  };

  const getStorageSummaryData = () => {
    return tenants.map((t: any) => ({
      name: t.name.split(' ')[0],
      Used: t.storageUsed,
      Quota: t.storageQuota
    }));
  };

  if (activeTenantId) {
    const tenant = tenants.find((t: any) => t.id === activeTenantId);
    if (!tenant) return null;

    // PROFILE TENANT DETAILED VIEW
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        <div className="page-header-actions" style={{ marginBottom: 0 }}>
          <button className="btn btn-outline" onClick={() => setActiveTenantId(null)}>Back to Tenants</button>
          <span className="badge badge-success">{tenant.status}</span>
        </div>

        <div className="profile-layout">
          {/* Profile Sidebar */}
          <div className="card profile-sidebar-card">
            <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-4)' }}>Tenant Information</h3>
            <ul className="profile-detail-list">
              <li className="profile-detail-item">
                <span className="profile-detail-label">Workspace Code</span>
                <span className="profile-detail-value">{tenant.id}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Developer Group</span>
                <span className="profile-detail-value">{tenant.name}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Subdomain Code</span>
                <span className="profile-detail-value">{tenant.subdomain}.buildercrm.io</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Licensing Tier</span>
                <span className="profile-detail-value">{tenant.tier}</span>
              </li>
            </ul>
          </div>

          {/* Right side settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Domain & Branding Rules</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <div className="form-group">
                  <label className="form-label">Mapped Custom Domain</label>
                  <input type="text" className="form-control" defaultValue={`crm.${tenant.subdomain}.com`} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Corporate Accent Hex Theme</label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <input type="color" defaultValue={tenant.brandingColor} style={{ width: '40px', height: '36px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 0, cursor: 'pointer' }} />
                    <input type="text" className="form-control" defaultValue={tenant.brandingColor} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Okta Single-Sign-On Mappings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
                <div className="form-group">
                  <label className="form-label">SAML Provider Entity ID URL</label>
                  <input type="text" className="form-control" defaultValue={`https://okta.com/idp/sso/saml/${tenant.id}`} style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Sign-On Entrypoint</label>
                  <input type="text" className="form-control" defaultValue="https://identity.okta-tenant.com/entry" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-3)' }}>
              <button className="btn btn-outline" onClick={() => setActiveTenantId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { showToast('SSO branding configurations compiled!', 'success'); setActiveTenantId(null); }}>Save Configurations</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-6)' }}>
      {/* Console Side Nav */}
      <div className="card" style={{ width: '220px', padding: 'var(--spacing-2) 0', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <BarChart4 size={16} /> Overview Info
        </button>
        <button className={`nav-link ${activeTab === 'tenants' ? 'active' : ''}`} onClick={() => setActiveTab('tenants')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <Building2 size={16} /> Tenants Management
        </button>
        <button className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <ShieldAlert size={16} /> System Audit Logs
        </button>
        <button className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <SettingsIcon size={16} /> Global settings
        </button>
      </div>

      {/* Console Content */}
      <div style={{ flex: 1 }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            <div className="grid-3" style={{ gap: 'var(--spacing-6)' }}>
              <div className="card">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Workspace allocated</span>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>{tenants.length} Tenants</h3>
              </div>
              <div className="card">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Central Uptime</span>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>99.98%</h3>
              </div>
              <div className="card">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Audit actions registered</span>
                <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>{logs.length} Audits</h3>
              </div>
            </div>

            <div className="card" style={{ height: '320px' }}>
              <h4 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Tenant Allocated storage metrics (GB)</h4>
              <div style={{ width: '100%', height: '85%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getStorageSummaryData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Used" fill="var(--brand-primary)" />
                    <Bar dataKey="Quota" fill="var(--text-muted)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Enterprise Tenants Workspace directory</h3>
              <button className="btn btn-primary" onClick={() => setShowAddTenant(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Plus size={14} /> Provision Tenant
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tenant ID</th>
                    <th>Developer Group</th>
                    <th>Subdomain router</th>
                    <th>Licensing Tier</th>
                    <th>Users Allocated</th>
                    <th>Storage (Used/Limit)</th>
                    <th>SSO Setup</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTenants ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>Loading tenants list...</td>
                    </tr>
                  ) : tenants.map((t: any) => (
                    <tr key={t.id} className="clickable" onClick={() => setActiveTenantId(t.id)}>
                      <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{t.id}</td>
                      <td style={{ fontWeight: 'bold' }}>{t.name}</td>
                      <td>{t.subdomain}.buildercrm.io</td>
                      <td>
                        <span className="badge badge-success">{t.tier}</span>
                      </td>
                      <td>{t.userQuota} Seats</td>
                      <td>{t.storageUsed} / {t.storageQuota} GB</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                        <span style={{ fontSize: 'var(--font-size-xs)' }}>Okta active</span>
                        <ChevronRight size={14} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Global System Security Audit Trail</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Scope Tenant</th>
                    <th>User RM</th>
                    <th>Action Details</th>
                    <th>Terminal IP</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>Querying logs history...</td>
                    </tr>
                  ) : logs.map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.date}</td>
                      <td><b>{l.tenant}</b></td>
                      <td>{l.user}</td>
                      <td>{l.action}</td>
                      <td style={{ fontSize: '11px' }}>{l.ip}</td>
                      <td>
                        <span className="badge badge-success">{l.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Global Backup & Attachment Settings</h3>
            <div className="form-group">
              <label className="form-label">Database Hot Snapshots Interval</label>
              <select className="form-control" style={{ width: '100%' }}>
                <option value="6h">Every 6 Hours</option>
                <option value="12h">Every 12 Hours</option>
                <option value="24h">Daily (24 Hours)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Attachment Limit Size (MB)</label>
              <input type="number" className="form-control" defaultValue={25} style={{ width: '100%' }} />
            </div>
            <button className="btn btn-primary" onClick={() => showToast('Global system thresholds updated!', 'success')} style={{ width: 'fit-content' }}>Save settings</button>
          </div>
        )}
      </div>

      {/* Provision Tenant Modal */}
      {showAddTenant && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Provision Workspace Tenant</h3>
            <button className="dialog-close" onClick={() => setShowAddTenant(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={handleAddTenantSubmit}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Workspace Code (ID)</label>
                  <input type="text" name="tenantId" className="form-control" placeholder="e.g. tenant-6" style={{ width: '100%' }} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Developer Group Name</label>
                  <input type="text" name="tenantName" className="form-control" placeholder="e.g. Puravankara Ltd" style={{ width: '100%' }} required />
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Subdomain Code</label>
                  <input type="text" name="subdomain" className="form-control" placeholder="e.g. puravankara" style={{ width: '100%' }} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Licensing Tier</label>
                  <select name="tier" className="form-control" style={{ width: '100%' }}>
                    <option value="Basic">Basic</option>
                    <option value="Professional">Professional</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">User Quota Limit</label>
                  <input type="number" name="userQuota" className="form-control" defaultValue={20} style={{ width: '100%' }} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Storage Capacity Quota (GB)</label>
                  <input type="number" name="storageQuota" className="form-control" defaultValue={25} style={{ width: '100%' }} required />
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddTenant(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Provision Schema</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
export default AdminConsole;
