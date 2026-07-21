import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import {
  Plus, Calendar as CalIcon, List, Clock, XCircle, Trash2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface TaskItem {
  id: number;
  client: string;
  activity: string;
  date: string;
  executive: string;
  task_type: string;
  status: 'Pending' | 'Completed';
  created_by: string;
}

const TYPE_BADGES: Record<string, string> = {
  'Call': 'badge-info',
  'Meeting': 'badge-warning',
  'Site Visit': 'badge-success',
  'Document': 'badge-neutral',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const Followups = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { userInfo } = useAuthStore();
  const isAdmin = ['Super Admin', 'Tenant Admin'].includes(userInfo?.role || '');

  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'timeline'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  // Calendar month being viewed (defaults to the current month)
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()); // 0-based

  const { data: tasks = [], isLoading } = useQuery<TaskItem[]>({
    queryKey: ['followups'],
    queryFn: async () => (await apiClient.get('/followups')).data
  });

  const { data: executives = [] } = useQuery<string[]>({
    queryKey: ['executives'],
    queryFn: async () => (await apiClient.get('/users/executives')).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await apiClient.post('/followups', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      showToast('Task scheduled successfully!', 'success');
      setShowAddModal(false);
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Could not schedule the task.', 'danger')
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => (await apiClient.post(`/followups/${id}/toggle`)).data,
    onSuccess: (task: TaskItem) => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      showToast(`Task marked ${task.status}.`, 'info');
    },
    onError: () => showToast('Could not update the task status.', 'danger')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/followups/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followups'] });
      showToast('Task deleted.', 'success');
      setSelectedTask(null);
    },
    onError: (err: any) => showToast(err?.response?.data?.detail || 'Delete failed.', 'danger')
  });

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    createMutation.mutate({
      client: (form.elements.namedItem('clientName') as HTMLInputElement).value,
      activity: (form.elements.namedItem('taskActivity') as HTMLInputElement).value,
      date: (form.elements.namedItem('taskDate') as HTMLInputElement).value,
      executive: (form.elements.namedItem('execName') as HTMLSelectElement).value,
      task_type: (form.elements.namedItem('taskType') as HTMLSelectElement).value,
    });
  };

  const shiftMonth = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalMonth(m); setCalYear(y);
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstWeekday = new Date(calYear, calMonth, 1).getDay();
    const cells = [];

    for (let pad = 0; pad < firstWeekday; pad++) {
      cells.push(<div key={`pad-${pad}`} style={{ minHeight: '80px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-muted)', opacity: 0.4 }} />);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = tasks.filter(t => t.date === dateStr);

      cells.push(
        <div
          key={i}
          style={{
            minHeight: '80px',
            border: '1px solid var(--border-color)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            backgroundColor: dayTasks.length > 0 ? 'var(--brand-bg-light)' : 'transparent'
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>{i}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
            {dayTasks.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedTask(t)}
                style={{
                  fontSize: '9px',
                  padding: '2px',
                  borderRadius: '2px',
                  backgroundColor: t.status === 'Completed' ? 'var(--color-success-bg)' : 'var(--brand-primary)',
                  color: t.status === 'Completed' ? 'var(--color-success)' : '#fff',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {t.client}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', padding: 'var(--spacing-2)', backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)' }}>
            {d}
          </div>
        ))}
        {cells}
      </div>
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>Task Follow-ups</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Calls, site visits, and agreement schedules checklists</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <div className="btn-group" style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('list')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }} aria-label="List view">
              <List size={16} />
            </button>
            <button className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('calendar')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }} aria-label="Calendar view">
              <CalIcon size={16} />
            </button>
            <button className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('timeline')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }} aria-label="Timeline view">
              <Clock size={16} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Plus size={16} /> Schedule Task
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client reference</th>
                  <th>Activity Description</th>
                  <th>Type</th>
                  <th>Follow-up Date</th>
                  <th>Assigned Exec</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Loading follow-up tasks...</td></tr>
                ) : tasks.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>
                    No follow-up tasks scheduled yet — use "Schedule Task" to create the first one.
                  </td></tr>
                ) : tasks.map(t => (
                  <tr key={t.id} className="clickable" onClick={() => setSelectedTask(t)}>
                    <td style={{ fontWeight: '600' }}>{t.client}</td>
                    <td>{t.activity}</td>
                    <td><span className={`badge ${TYPE_BADGES[t.task_type] || 'badge-neutral'}`}>{t.task_type}</span></td>
                    <td style={{ fontWeight: '500' }}>{t.date}</td>
                    <td>{t.executive}</td>
                    <td onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(t.id); }}>
                      <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}`} style={{ cursor: 'pointer' }} title="Click to toggle status">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
              <button className="btn btn-outline" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
              <h4 style={{ fontWeight: 'bold', minWidth: '170px', textAlign: 'center' }}>{MONTH_NAMES[calMonth]} {calYear}</h4>
              <button className="btn btn-outline" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', display: 'flex', gap: 'var(--spacing-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'var(--brand-primary)', borderRadius: '2px' }} /> Pending</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-success)', borderRadius: '2px' }} /> Completed</div>
            </div>
          </div>
          {renderCalendar()}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {tasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--spacing-8)' }}>
              No follow-up tasks scheduled yet.
            </div>
          ) : tasks.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', gap: 'var(--spacing-4)', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', borderRight: '1px solid var(--border-color)', paddingRight: 'var(--spacing-4)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--brand-primary)' }}>{t.date.split('-')[2]}</span>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  {MONTH_NAMES[parseInt(t.date.split('-')[1], 10) - 1]?.substring(0, 3)} {t.date.split('-')[0]}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: 'var(--font-size-md)' }}>{t.client}</h4>
                  <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{t.activity}</p>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
                  Owner: {t.executive} · <span className={`badge ${TYPE_BADGES[t.task_type] || 'badge-neutral'}`}>{t.task_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task detail prompt dialog */}
      {selectedTask && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Follow-up Task Parameters</h3>
            <button className="dialog-close" onClick={() => setSelectedTask(null)}><XCircle size={16} /></button>
          </div>
          <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Client Name</div>
              <div style={{ fontWeight: 'bold' }}>{selectedTask.client}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Schedule Date</div>
              <div style={{ fontWeight: 'bold' }}>{selectedTask.date}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Activity parameters</div>
              <div style={{ fontWeight: 'bold' }}>{selectedTask.activity}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Assigned sales rep</div>
              <div style={{ fontWeight: 'bold' }}>{selectedTask.executive}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Execution Stage</div>
              <span className={`badge ${selectedTask.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{selectedTask.status}</span>
            </div>
          </div>
          <div className="dialog-footer">
            {isAdmin && (
              <button type="button" className="btn btn-outline" style={{ color: 'var(--color-danger)' }} onClick={() => deleteMutation.mutate(selectedTask.id)}>
                <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete
              </button>
            )}
            <button type="button" className="btn btn-outline" onClick={() => setSelectedTask(null)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              toggleMutation.mutate(selectedTask.id);
              setSelectedTask(null);
            }}>Toggle execution status</button>
          </div>
        </dialog>
      )}

      {/* Schedule Task Modal */}
      {showAddModal && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Schedule Relationship Task</h3>
            <button className="dialog-close" onClick={() => setShowAddModal(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={handleAddTask}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Client / Prospect Name</label>
                <input type="text" name="clientName" className="form-control" placeholder="e.g. Rajesh Nair" style={{ width: '100%' }} required minLength={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Task Activity Description</label>
                <input type="text" name="taskActivity" className="form-control" placeholder="e.g. Collect documents and verify pan details" style={{ width: '100%' }} required minLength={3} />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Task Date</label>
                  <input type="date" name="taskDate" className="form-control" style={{ width: '100%' }} required min={todayStr} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Task Type</label>
                  <select name="taskType" className="form-control" style={{ width: '100%' }}>
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Site Visit">Site Visit</option>
                    <option value="Document">Document</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Executive Owner</label>
                  <select name="execName" className="form-control" style={{ width: '100%' }} defaultValue={userInfo?.username}>
                    {(executives.length ? executives : [userInfo?.username || 'admin']).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
