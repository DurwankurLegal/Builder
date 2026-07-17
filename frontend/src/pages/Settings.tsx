import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { 
  Building2, HardHat, ShieldCheck, Share2, Plus, Trash2
} from 'lucide-react';

export const Settings = () => {
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'company' | 'projects' | 'executives' | 'channels'>('company');

  // Local state directories
  const [projects, setProjects] = useState([
    { id: '1', name: 'Sunrise Heights', location: 'Whitefield, Bangalore', rera: 'PRM/KA/RERA/1251/446/PR/180516/001790', units: 120 },
    { id: '2', name: 'Green Meadows', location: 'Sarjapur, Bangalore', rera: 'PRM/KA/RERA/1251/308/PR/200211/003254', units: 85 },
    { id: '3', name: 'Royal Residency', location: 'Indiranagar, Bangalore', rera: 'PRM/KA/RERA/1251/310/PR/191024/002980', units: 45 },
  ]);

  const [executives, setExecutives] = useState([
    { id: '1', name: 'Priya Patel', email: 'priya.patel@builder.com', role: 'Sales Relationship Manager', status: 'Active' },
    { id: '2', name: 'Amit Singh', email: 'amit.singh@builder.com', role: 'Sales Representative', status: 'Active' },
    { id: '3', name: 'Sanjay Kumar', email: 'sanjay.kumar@builder.com', role: 'Sales Executive', status: 'On Leave' },
  ]);

  const [channels, setChannels] = useState([
    { name: 'Google Ads', status: true },
    { name: 'Referral', status: true },
    { name: 'Direct Visit', status: true },
    { name: 'Newspaper', status: false },
    { name: 'Social Media', status: true },
  ]);

  const saveSettings = (section: string) => {
    showToast(`${section} parameters saved successfully!`, 'success');
  };

  const deleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
    showToast('Project removed from active registry.', 'info');
  };

  const deleteExec = (id: string) => {
    setExecutives(executives.filter(e => e.id !== id));
    showToast('Executive account deactivated.', 'info');
  };

  const toggleChannel = (index: number) => {
    const updated = [...channels];
    updated[index].status = !updated[index].status;
    setChannels(updated);
    showToast(`${updated[index].name} lead channel toggled!`, 'info');
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--spacing-6)' }}>
      {/* Settings Navigation Menu */}
      <div className="card" style={{ width: '240px', padding: 'var(--spacing-2) 0', display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
        <button className={`nav-link ${activeTab === 'company' ? 'active' : ''}`} onClick={() => setActiveTab('company')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <Building2 size={16} /> Company Profile
        </button>
        <button className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <HardHat size={16} /> Projects Directory
        </button>
        <button className={`nav-link ${activeTab === 'executives' ? 'active' : ''}`} onClick={() => setActiveTab('executives')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <ShieldCheck size={16} /> Sales Executives
        </button>
        <button className={`nav-link ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', width: '100%', padding: 'var(--spacing-3) var(--spacing-4)', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
          <Share2 size={16} /> Lead Channels
        </button>
      </div>

      {/* Settings Content Area */}
      <div style={{ flex: 1 }}>
        {activeTab === 'company' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Company Corporate Profile</h3>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Developer Legal Name</label>
                <input type="text" className="form-control" defaultValue="Prestige Group Developers" style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">RERA Registration ID</label>
                <input type="text" className="form-control" defaultValue="RERA-KA-BLR-0046" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CIN (Corporate ID Number)</label>
                <input type="text" className="form-control" defaultValue="L70101KA1997PLC022382" style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Corporate GSTIN</label>
                <input type="text" className="form-control" defaultValue="29AAAAA0000A1Z5" style={{ width: '100%' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Headquarters Office Address</label>
              <input type="text" className="form-control" defaultValue="Prestige Falcon Towers, 19 Brunton Rd, Bangalore, KA" style={{ width: '100%' }} />
            </div>
            <button className="btn btn-primary" onClick={() => saveSettings('Company profile')} style={{ width: 'fit-content', marginTop: 'var(--spacing-2)' }}>Save Company Profile</button>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Active Projects Masters Directory</h3>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> Add Project</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Location Area</th>
                    <th>RERA Certification No</th>
                    <th>Active Units</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.location}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.rera}</td>
                      <td>{p.units}</td>
                      <td>
                        <button className="btn btn-outline-danger" onClick={() => deleteProject(p.id)} style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'executives' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Sales RM accounts directory</h3>
              <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> Add Executive</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Corporate Email ID</th>
                    <th>Designation role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {executives.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 'bold' }}>{e.name}</td>
                      <td>{e.email}</td>
                      <td>{e.role}</td>
                      <td>
                        <span className={`badge ${e.status === 'Active' ? 'badge-success' : 'badge-warning'}`}>{e.status}</span>
                      </td>
                      <td>
                        <button className="btn btn-outline-danger" onClick={() => deleteExec(e.id)} style={{ padding: '4px 8px' }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>Lead Inbound Channels Configurations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-2)' }}>
              {channels.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontWeight: 'bold' }}>{c.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.status ? 'Capture Enabled' : 'Deactivated'}</span>
                    <input type="checkbox" checked={c.status} onChange={() => toggleChannel(i)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Settings;
