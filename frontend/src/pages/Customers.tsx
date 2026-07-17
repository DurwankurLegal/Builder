import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useUIStore } from '../store/uiStore';
import { exportToCsv } from '../utils/exportCsv';
import {
  Plus, Search, Download, ArrowLeft, XCircle, RotateCcw
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(3, 'Name must have at least 3 letters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Invalid phone number'),
  address: z.string().min(1, 'Please enter address details'),
  project: z.string().min(1, 'Please select project RERA'),
  budget: z.string().min(1, 'Please specify property value'),
  executive: z.string().min(1, 'Please select executive'),
  allocated_unit: z.string().min(1, 'Please enter allocated flat tower number'),
  config: z.string().min(1, 'Please select BHK size'),
  notes: z.string().optional()
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export const Customers = () => {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [activeCustId, setActiveCustId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Queries
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search, projectFilter, statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/customers', {
        params: { search, project: projectFilter, status: statusFilter }
      });
      return res.data;
    }
  });

  const { data: activeCust } = useQuery({
    queryKey: ['customer', activeCustId],
    queryFn: async () => {
      if (!activeCustId) return null;
      const res = await apiClient.get(`/customers/${activeCustId}`);
      return res.data;
    },
    enabled: !!activeCustId
  });

  // Mutations
  const createCustMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const payload = {
        ...data,
        status: 'Agreement Pending',
        documents: ['PAN Card', 'Aadhaar Card']
      };
      const res = await apiClient.post('/customers', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      showToast('Active customer registered successfully!', 'success');
      setShowAddModal(false);
    }
  });

  const updateCustMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiClient.put(`/customers/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', activeCustId] });
      showToast('Customer profile parameters updated!', 'success');
    }
  });

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      project: 'Sunrise Heights',
      budget: '₹80 Lakhs',
      executive: 'Priya Patel',
      config: '2BHK'
    }
  });

  const onSubmitCustomer = (values: CustomerFormValues) => {
    createCustMutation.mutate(values);
  };

  const toggleDocumentCheck = (doc: string) => {
    if (!activeCust) return;
    let documents = [...(activeCust.documents || [])];
    if (documents.includes(doc)) {
      documents = documents.filter(d => d !== doc);
    } else {
      documents.push(doc);
    }

    let status = activeCust.status;
    if (documents.includes('PAN Card') && documents.includes('Aadhaar Card') && documents.includes('Agreement Signed')) {
      status = 'Agreement Executed';
    } else if (documents.includes('Registrar Registration')) {
      status = 'Registered';
    } else {
      status = 'Agreement Pending';
    }

    updateCustMutation.mutate({
      id: activeCust.id,
      data: { documents, status }
    });
  };

  const handleNotesSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const notesInput = form.elements.namedItem('customerNotes') as HTMLInputElement;
    if (!notesInput || !notesInput.value || !activeCust) return;

    updateCustMutation.mutate({
      id: activeCust.id,
      data: { notes: notesInput.value }
    });
    notesInput.value = '';
  };

  if (activeCustId && activeCust) {
    const allDocs = ['PAN Card', 'Aadhaar Card', 'Agreement Signed', 'Registrar Registration'];
    const checkedCount = (activeCust.documents || []).length;
    const progressPercent = Math.round((checkedCount / allDocs.length) * 100);

    // DETAILED PROFILE VIEW
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
        {/* Header Actions */}
        <div className="page-header-actions" style={{ marginBottom: 0 }}>
          <div>
            <button className="btn btn-outline" onClick={() => setActiveCustId(null)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <ArrowLeft size={16} /> Back to Customers
            </button>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 'var(--spacing-2)' }}>
              Customer No: <b>{activeCust.id}</b> &bull; Managed by {activeCust.executive}
            </p>
          </div>
          <span className={`badge ${
            activeCust.status === 'Registered' ? 'badge-success' : 
            activeCust.status === 'Agreement Executed' ? 'badge-info' : 'badge-warning'
          }`}>{activeCust.status}</span>
        </div>

        {/* Profile Split Layout */}
        <div className="profile-layout">
          {/* Left Side: Profile Sidebar Card */}
          <div className="card profile-sidebar-card">
            <div className="profile-avatar-large" style={{ background: 'var(--brand-bg-light)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
              {activeCust.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <h3 style={{ fontSize: 'var(--font-size-base)' }}>{activeCust.name}</h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Active Customer</p>

            <ul className="profile-detail-list">
              <li className="profile-detail-item">
                <span className="profile-detail-label">Mobile</span>
                <span className="profile-detail-value">{activeCust.phone}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Email</span>
                <span className="profile-detail-value" style={{ wordBreak: 'break-all' }}>{activeCust.email}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Address</span>
                <span className="profile-detail-value">{activeCust.address}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Project RERA</span>
                <span className="profile-detail-value">{activeCust.project}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Property Value</span>
                <span className="profile-detail-value">{activeCust.budget}</span>
              </li>
              <li className="profile-detail-item">
                <span className="profile-detail-label">Assigned Executive</span>
                <span className="profile-detail-value">{activeCust.executive}</span>
              </li>
            </ul>
          </div>

          {/* Right Side: Content Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
            {/* Unit Allocation Details */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Allocated Property Parameters</h3>
              <div className="grid-3" style={{ gap: 'var(--spacing-4)' }}>
                <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Unit Number</div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-base)' }}>{activeCust.allocated_unit}</div>
                </div>
                <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Configuration</div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-base)' }}>{activeCust.config}</div>
                </div>
                <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Slab Area / Size</div>
                  <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-base)' }}>{activeCust.area || '1,450 Sq.Ft.'}</div>
                </div>
              </div>
            </div>

            {/* Legal Documents Verification Checklist */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Compliance Documents Verification</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-4)' }}>
                <div className="progress-bar" style={{ flex: 1, height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div className="progress" style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--brand-primary)', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'bold' }}>{progressPercent}% Done</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                {allDocs.map((doc) => {
                  const isChecked = (activeCust.documents || []).includes(doc);
                  return (
                    <div 
                      key={doc} 
                      onClick={() => toggleDocumentCheck(doc)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                    >
                      <span style={{ fontWeight: '500', fontSize: 'var(--font-size-sm)' }}>{doc}</span>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {}} // handled by parent onClick
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Account Remarks / Customer Notes */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 'var(--spacing-4)' }}>Administrative Remarks</h3>
              <div style={{ padding: 'var(--spacing-3)', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-4)' }}>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-main)', fontStyle: activeCust.notes ? 'normal' : 'italic' }}>
                  {activeCust.notes || 'No remarks recorded for this customer.'}
                </p>
              </div>

              <form onSubmit={handleNotesSubmit} style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                <input 
                  type="text" 
                  name="customerNotes" 
                  className="form-control" 
                  placeholder="Add corporate verification remarks..." 
                  style={{ flex: 1 }} 
                  required 
                />
                <button type="submit" className="btn btn-primary">Update Notes</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT DATA TABLE VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
      {/* Page Header Actions */}
      <div className="page-header-actions">
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Active Customers</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Verify compliance documents and track legal registry registrations</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
          <button className="btn btn-outline" onClick={() => {
            const n = exportToCsv('customers_register', [
              { key: 'id', label: 'Customer ID' },
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'address', label: 'Address' },
              { key: 'project', label: 'Project' },
              { key: 'budget', label: 'Budget' },
              { key: 'executive', label: 'Executive' },
              { key: 'status', label: 'Status' },
              { key: 'allocated_unit', label: 'Allocated Unit' },
              { key: 'config', label: 'Config' },
            ], customers);
            showToast(`Exported ${n} customer record(s) to CSV.`, 'success');
          }}>
            <Download size={16} style={{ marginRight: '6px' }} /> Export Register
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Add Customer
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by name, ID, unit number..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-selects">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Agreement Pending">Agreement Pending</option>
            <option value="Agreement Executed">Agreement Executed</option>
            <option value="Registered">Registered</option>
          </select>

          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="">All Projects</option>
            <option value="Sunrise Heights">Sunrise Heights</option>
            <option value="Green Meadows">Green Meadows</option>
            <option value="Royal Residency">Royal Residency</option>
          </select>

          <button className="btn btn-ghost" onClick={() => { setSearch(''); setProjectFilter(''); setStatusFilter(''); }} style={{ padding: 'var(--spacing-2)' }}>
            <RotateCcw size={16} style={{ marginRight: '4px' }} /> Reset
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Client Name</th>
                <th>Project RERA</th>
                <th>Allocated unit</th>
                <th>BHK Size</th>
                <th>Primary Contact</th>
                <th>Assigned Exec</th>
                <th>Verification State</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>Querying customer database...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--spacing-8)', color: 'var(--text-muted)' }}>No active customer profiles found.</td>
                </tr>
              ) : customers.map((c: any) => (
                <tr key={c.id} className="clickable" onClick={() => setActiveCustId(c.id)}>
                  <td style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{c.id}</td>
                  <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>{c.name}</td>
                  <td>{c.project}</td>
                  <td style={{ fontWeight: '500' }}>{c.allocated_unit}</td>
                  <td>{c.config}</td>
                  <td>{c.phone}</td>
                  <td>{c.executive}</td>
                  <td>
                    <span className={`badge ${
                      c.status === 'Registered' ? 'badge-success' : 
                      c.status === 'Agreement Executed' ? 'badge-info' : 'badge-warning'
                    }`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <dialog open className="dialog">
          <div className="dialog-header">
            <h3 className="dialog-title">Register Customer Profile</h3>
            <button className="dialog-close" onClick={() => setShowAddModal(false)}><XCircle size={16} /></button>
          </div>
          <form onSubmit={handleSubmit(onSubmitCustomer)}>
            <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input type="text" className="form-control" placeholder="e.g. Meera Iyer" style={{ width: '100%' }} {...register('name')} />
                {errors.name && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.name.message}</span>}
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email ID</label>
                  <input type="email" className="form-control" placeholder="name@domain.com" style={{ width: '100%' }} {...register('email')} />
                  {errors.email && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.email.message}</span>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Mobile Number</label>
                  <input type="text" className="form-control" placeholder="9876543210" style={{ width: '100%' }} {...register('phone')} />
                  {errors.phone && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.phone.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Postal Address</label>
                <input type="text" className="form-control" placeholder="Enter postal address details" style={{ width: '100%' }} {...register('address')} />
                {errors.address && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.address.message}</span>}
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Allocated Project</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('project')}>
                    <option value="Sunrise Heights">Sunrise Heights</option>
                    <option value="Green Meadows">Green Meadows</option>
                    <option value="Royal Residency">Royal Residency</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Property Value</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('budget')}>
                    <option value="₹80 Lakhs">₹80 Lakhs</option>
                    <option value="₹1.20 Crore">₹1.20 Crore</option>
                    <option value="₹2.50 Crore">₹2.50 Crore</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'flex', gap: 'var(--spacing-4)' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Allocated unit</label>
                  <input type="text" className="form-control" placeholder="e.g. Tower A Flat 402" style={{ width: '100%' }} {...register('allocated_unit')} />
                  {errors.allocated_unit && <span className="help-text" style={{ color: 'var(--color-danger)' }}>{errors.allocated_unit.message}</span>}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">BHK Size</label>
                  <select className="form-control" style={{ width: '100%' }} {...register('config')}>
                    <option value="2BHK">2BHK</option>
                    <option value="3BHK">3BHK</option>
                    <option value="4BHK">4BHK</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create Profile</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
};
