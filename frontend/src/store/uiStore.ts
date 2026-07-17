import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'danger' | 'info' | 'warning';
}

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  searchOpen: boolean;
  toasts: ToastMessage[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (val: boolean) => void;
  setSidebarMobileOpen: (val: boolean) => void;
  setSearchOpen: (val: boolean) => void;
  showToast: (text: string, type?: 'success' | 'danger' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  searchOpen: false,
  toasts: [],
  
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
  setSidebarMobileOpen: (val) => set({ sidebarMobileOpen: val }),
  setSearchOpen: (val) => set({ searchOpen: val }),
  
  showToast: (text, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, text, type };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    // Auto-remove toast after 4s
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));
