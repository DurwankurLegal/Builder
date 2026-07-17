import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { 
  Plus, Calendar as CalIcon, List, Clock, XCircle
} from 'lucide-react';

interface TaskItem {
  id: string;
  client: string;
  activity: string;
  date: string;
  exec: string;
  status: 'Pending' | 'Completed';
}

const DEFAULT_TASKS: TaskItem[] = [
  { id: '1', client: 'Rajesh Nair', activity: 'Telephonic Follow-up: Discuss CLP Milestones', date: '2026-07-16', exec: 'Priya Patel', status: 'Pending' },
  { id: '2', client: 'Meera Iyer', activity: 'Site Visit: Accompany unit inspection', date: '2026-07-18', exec: 'Amit Singh', status: 'Pending' },
  { id: '3', client: 'Vikram Seth', activity: 'Document Collection: PAN Card photo copy', date: '2026-07-20', exec: 'Priya Patel', status: 'Pending' },
  { id: '4', client: 'Aarav Sharma', activity: 'Initial Call: Introduce luxury properties details', date: '2026-07-15', exec: 'Priya Patel', status: 'Completed' },
  { id: '5', client: 'Neha Gupta', activity: 'Site Visit: Heights Block B review', date: '2026-07-12', exec: 'Amit Singh', status: 'Completed' }
];

export const Followups = () => {
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'timeline'>('list');
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('crm-tasks-list');
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const saveTasks = (newTasks: TaskItem[]) => {
    setTasks(newTasks);
    localStorage.setItem('crm-tasks-list', JSON.stringify(newTasks));
  };

  const toggleTaskStatus = (id: string) => {
    const newTasks = tasks.map(t => {
      if (t.id === id) {
        const nextStatus: 'Pending' | 'Completed' = t.status === 'Completed' ? 'Pending' : 'Completed';
        showToast(`Task status toggled to ${nextStatus}!`, 'info');
        return { ...t, status: nextStatus };
      }
      return t;
    });
    saveTasks(newTasks);
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const client = (form.elements.namedItem('clientName') as HTMLInputElement).value;
    const activity = (form.elements.namedItem('taskActivity') as HTMLInputElement).value;
    const date = (form.elements.namedItem('taskDate') as HTMLInputElement).value;
    const exec = (form.elements.namedItem('execName') as HTMLSelectElement).value;

    const newTask: TaskItem = {
      id: `${Date.now()}`,
      client,
      activity,
      date,
      exec,
      status: 'Pending'
    };

    saveTasks([newTask, ...tasks]);
    showToast('Task scheduled successfully!', 'success');
    setShowAddModal(false);
  };

  const renderCalendar = () => {
    const daysInMonth = 31;
    const grid = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `2026-07-${i < 10 ? '0' + i : i}`;
      const dayTasks = tasks.filter(t => t.date === dateStr);

      grid.push(
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
        {grid}
      </div>
    );
  };

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
            <button className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('list')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }}>
              <List size={16} />
            </button>
            <button className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('calendar')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }}>
              <CalIcon size={16} />
            </button>
            <button className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('timeline')} style={{ borderRadius: 0, padding: 'var(--spacing-2) var(--spacing-4)' }}>
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
                  <th>Follow-up Date</th>
                  <th>Assigned Exec</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} className="clickable" onClick={() => toggleTaskStatus(t.id)}>
                    <td style={{ fontWeight: '600' }}>{t.client}</td>
                    <td>{t.activity}</td>
                    <td style={{ fontWeight: '500' }}>{t.date}</td>
                    <td>{t.exec}</td>
                    <td>
                      <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
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
            <h4 style={{ fontWeight: 'bold' }}>July 2026 Calendar Schedule</h4>
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
          {tasks.map((t) => (
            <div key={t.id} className="card" style={{ display: 'flex', gap: 'var(--spacing-4)', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', borderRight: '1px solid var(--border-color)', paddingRight: 'var(--spacing-4)' }}>
                <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold', color: 'var(--brand-primary)' }}>{t.date.split('-')[2]}</span>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>JUL 2026</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: 'var(--font-size-md)' }}>{t.client}</h4>
                  <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{t.status}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>{t.activity}</p>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>Owner: {t.exec}</div>
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
              <div style={{ fontWeight: 'bold' }}>{selectedTask.exec}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Execution Stage</div>
              <span className={`badge ${selectedTask.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{selectedTask.status}</span>
            </div>
          </div>
          <div className="dialog-footer">
            <button type="button" className="btn btn-outline" onClick={() => setSelectedTask(null)}>Close</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              toggleTaskStatus(selectedTask.id);
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
                <input type="text" name="clientName" className="form-control" placeholder="e.g. Rajesh Nair" style={{ width: '100%' }} required />
              </div>
              <div className="form-group">
                <label className="form-label">Task Activity Description</label>
                <input type="text" name="taskActivity" className="form-control" placeholder="e.g. Collect documents and verify pan details" style={{ width: '100%' }} required />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Task Date</label>
                  <input type="date" name="taskDate" className="form-control" style={{ width: '100%' }} required />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Executive Owner</label>
                  <select name="execName" className="form-control" style={{ width: '100%' }}>
                    <option value="Priya Patel">Priya Patel</option>
                    <option value="Amit Singh">Amit Singh</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
