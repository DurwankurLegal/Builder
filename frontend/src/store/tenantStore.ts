import { create } from 'zustand';

interface TenantState {
  activeTenantId: string;
  activeTenantName: string;
  activeStyle: string;
  activeThemeMode: string;
  setActiveTenant: (id: string, name: string) => void;
  setActiveStyle: (style: string) => void;
  setActiveThemeMode: (mode: string) => void;
}

export const useTenantStore = create<TenantState>((set) => {
  // Read initial cached styles or fallback defaults
  const savedTenantId = localStorage.getItem('crm-active-tenant-id') || 'tenant-1';
  const savedTenantName = localStorage.getItem('crm-active-tenant-name') || 'Prestige Group';
  const savedStyle = localStorage.getItem('crm-style') || 'indigo';
  const savedTheme = localStorage.getItem('crm-theme') || 'light';

  // Apply selectors initially to document DOM
  document.documentElement.setAttribute('data-style', savedStyle);
  document.documentElement.setAttribute('data-theme', savedTheme);

  return {
    activeTenantId: savedTenantId,
    activeTenantName: savedTenantName,
    activeStyle: savedStyle,
    activeThemeMode: savedTheme,
    
    setActiveTenant: (id, name) => {
      localStorage.setItem('crm-active-tenant-id', id);
      localStorage.setItem('crm-active-tenant-name', name);
      set({ activeTenantId: id, activeTenantName: name });
    },
    
    setActiveStyle: (style) => {
      localStorage.setItem('crm-style', style);
      document.documentElement.setAttribute('data-style', style);
      set({ activeStyle: style });
    },
    
    setActiveThemeMode: (mode) => {
      localStorage.setItem('crm-theme', mode);
      document.documentElement.setAttribute('data-theme', mode);
      set({ activeThemeMode: mode });
    }
  };
});
