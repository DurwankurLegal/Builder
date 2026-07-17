import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../config/api';
import { useAuthStore } from '../store/authStore';
import { useTenantStore } from '../store/tenantStore';
import { useUIStore } from '../store/uiStore';
import { ToastContainer } from '../components/ToastContainer';
import { SearchModal } from '../components/SearchModal';
import {
  LayoutDashboard, Users, ShieldAlert, CheckCircle2, XCircle,
  Calendar, BarChart4, Settings, ShieldCheck, Search, Moon, Sun,
  Palette, Bell, LogOut, Menu, User, Inbox, PhoneCall, BadgeCheck
} from 'lucide-react';

export const MainLayout = () => {
  const { logout, userInfo } = useAuthStore();
  const { 
    activeTenantId, setActiveTenant,
    activeStyle, setActiveStyle,
    activeThemeMode, setActiveThemeMode
  } = useTenantStore();
  const { 
    sidebarCollapsed, toggleSidebar,
    sidebarMobileOpen, setSidebarMobileOpen,
    setSearchOpen, showToast
  } = useUIStore();

  const location = useLocation();
  const navigate = useNavigate();
  const [showNotify, setShowNotify] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Router matching paths to highlights
  const activePath = location.pathname;

  // Live pipeline counts shown as nav badges beside each lead module
  const { data: pipelineStats } = useQuery({
    queryKey: ['pipeline-stats', activeTenantId],
    queryFn: async () => (await apiClient.get('/pipeline/stats')).data,
    refetchInterval: 15000
  });

  const sidebarLinks: { label: string; path: string; icon: any; count?: number }[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Raw Leads', path: '/raw-leads', icon: Inbox, count: pipelineStats?.raw },
    { label: 'Called Leads', path: '/called-leads', icon: PhoneCall, count: pipelineStats?.called },
    { label: 'Qualified Leads', path: '/qualified-leads', icon: BadgeCheck, count: pipelineStats?.qualified },
    { label: 'Leads Database', path: '/leads', icon: Users },
    { label: 'Active Customers', path: '/customers', icon: ShieldCheck },
    { label: 'Closed Bookings', path: '/bookings', icon: CheckCircle2 },
    { label: 'Lost Deals', path: '/lost', icon: XCircle },
    { label: 'Follow-ups', path: '/followups', icon: Calendar },
    { label: 'Analytical Reports', path: '/reports', icon: BarChart4 },
    { label: 'System Settings', path: '/settings', icon: Settings },
  ];

  // Append Admin Console option for Super Admin
  if (userInfo?.role === 'Super Admin') {
    sidebarLinks.push({ label: 'Admin Console', path: '/admin', icon: ShieldAlert });
  }

  // Format Breadcrumbs
  const getBreadcrumbs = () => {
    const segments = activePath.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    return segments.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')).join(' / ');
  };

  const handleTenantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const nameMap: Record<string, string> = {
      'tenant-1': 'Prestige Group',
      'tenant-2': 'DLF Limited',
      'tenant-3': 'LODHA Group',
      'tenant-4': 'Sobha Developers',
      'tenant-5': 'Godrej Properties'
    };
    setActiveTenant(val, nameMap[val]);
    showToast(`Switched workspace context to ${nameMap[val]}!`, 'success');
    // Reload components context
    navigate(activePath);
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setActiveStyle(val);
    showToast(`Branding palette switched to ${val.charAt(0).toUpperCase() + val.slice(1)}!`, 'success');
  };

  const toggleTheme = () => {
    const newTheme = activeThemeMode === 'light' ? 'dark' : 'light';
    setActiveThemeMode(newTheme);
    showToast(`Theme switched to ${newTheme === 'light' ? 'Light' : 'Dark'} mode!`, 'info');
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', width: '100%' }}>
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarMobileOpen ? 'mobile-open' : ''}`} id="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon-svg" style={{ backgroundColor: 'var(--brand-primary)', borderRadius: 'var(--radius-md)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', marginRight: 'var(--spacing-2)' }}>
              B
            </div>
            {!sidebarCollapsed && <span className="sidebar-logo-text">Builder CRM</span>}
          </div>
          <button className="sidebar-toggle-btn" id="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar Navigation">
            <Menu size={16} />
          </button>
        </div>

        <nav className="sidebar-menu">
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
            {sidebarLinks.map(link => {
              const Icon = link.icon;
              const isActive = activePath.startsWith(link.path);
              return (
                <li key={link.path} className={`sidebar-item ${isActive ? 'active' : ''}`} id={`nav-${link.path.replace('/', '') || 'dashboard'}`}>
                  <Link to={link.path} onClick={() => setSidebarMobileOpen(false)}>
                    <Icon size={18} />
                    {!sidebarCollapsed && <span className="sidebar-item-label">{link.label}</span>}
                    {!sidebarCollapsed && link.count != null && link.count > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--brand-primary)',
                        color: '#fff',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 700,
                        minWidth: '20px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 6px'
                      }}>
                        {link.count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Sidebar mobile overlay drawer */}
      {sidebarMobileOpen && (
        <div className="sidebar-overlay" id="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)} />
      )}

      {/* TOP HEADER NAVBAR */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="mobile-menu-toggle" id="mobile-menu-toggle-btn" onClick={() => setSidebarMobileOpen(true)} aria-label="Open Navigation Menu">
            <Menu size={20} />
          </button>
          
          {/* Breadcrumb tracker */}
          <nav className="breadcrumb" id="breadcrumb" aria-label="Breadcrumb Navigation">
            {getBreadcrumbs()}
          </nav>

          {/* Multi-Tenant Selector dropdown */}
          <div style={{ marginLeft: 'var(--spacing-4)', borderLeft: '1px solid var(--border-color)', paddingLeft: 'var(--spacing-4)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workspace:</span>
            <select 
              id="topbar-tenant-select" 
              value={activeTenantId} 
              onChange={handleTenantChange}
            >
              <option value="tenant-1">Prestige Group</option>
              <option value="tenant-2">DLF Limited</option>
              <option value="tenant-3">LODHA Group</option>
              <option value="tenant-4">Sobha Developers</option>
              <option value="tenant-5">Godrej Properties</option>
            </select>
          </div>
        </div>

        <div className="topbar-right">
          {/* Command Search Trigger */}
          <button className="search-trigger-btn" id="search-trigger" onClick={() => setSearchOpen(true)} aria-label="Global Search DB">
            <Search size={16} />
            <span>Search CRM...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>

          {/* Light/Dark Mode Switcher */}
          <button className="action-icon-btn" id="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle Interface Theme">
            {activeThemeMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Palette Style Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
            <Palette size={16} style={{ color: 'var(--text-muted)', marginRight: '2px' }} />
            <select 
              id="topbar-style-select" 
              value={activeStyle}
              onChange={handleStyleChange}
              aria-label="Select Branding Palette"
            >
              <option value="indigo">Corporate Indigo</option>
              <option value="emerald">Emerald Garden</option>
              <option value="amber">Sunset Terracotta</option>
              <option value="violet">Royal Amethyst</option>
              <option value="midnight">Midnight Gold (Dark)</option>
            </select>
          </div>

          {/* Notification Panel trigger */}
          <button className="action-icon-btn" id="notify-btn" onClick={() => setShowNotify(!showNotify)} aria-label="Show Alerts Notifications" style={{ position: 'relative' }}>
            <Bell size={18} />
            <span className="btn-badge">3</span>
            
            {showNotify && (
              <div className="dropdown-menu active" id="notify-dropdown" style={{ display: 'block', right: 0, top: '45px', width: '280px', textAlign: 'left' }}>
                <div className="dropdown-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>New lead registered</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Divya Sen registered via Facebook</div>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>Site Visit Completed</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aarav Mehta visited tower B flat 503</div>
                  </div>
                </div>
                <div className="dropdown-item">
                  <div>
                    <div style={{ fontWeight: 600 }}>Milestone Payment Overdue</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BK-9001 (Kabir Malhotra) 5th floor slab payment</div>
                  </div>
                </div>
              </div>
            )}
          </button>

          {/* Profile trigger */}
          <div className="profile-menu-container" style={{ position: 'relative' }}>
            <button className="profile-trigger" id="profile-trigger" onClick={() => setShowProfile(!showProfile)} aria-label="Account Settings menu">
              <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {userInfo?.username.substring(0, 2).toUpperCase() || 'RM'}
              </div>
            </button>
            
            {showProfile && (
              <div className="dropdown-menu active" id="profile-dropdown" style={{ display: 'block', right: 0, top: '45px', width: '180px', textAlign: 'left' }}>
                <div className="dropdown-item" style={{ borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
                  {userInfo?.username} <br />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{userInfo?.role}</span>
                </div>
                <div className="dropdown-item" onClick={() => navigate('/settings')} style={{ cursor: 'pointer' }}>
                  <User size={14} style={{ marginRight: '8px' }} /> Account Profile
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item danger" onClick={logout} style={{ cursor: 'pointer' }}>
                  <LogOut size={14} style={{ marginRight: '8px' }} /> Log Out
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SCROLLABLE CONTENT BODY */}
      <main className="main-content" id="app-content" style={{ overflowY: 'auto' }}>
        <Outlet />
      </main>

      {/* Global Elements */}
      <SearchModal />
      <ToastContainer />
    </div>
  );
};
