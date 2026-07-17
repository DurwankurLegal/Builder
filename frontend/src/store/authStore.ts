import { create } from 'zustand';

interface UserInfo {
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  userInfo: UserInfo | null;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial states from storage
  const savedToken = localStorage.getItem('crm-token');
  const savedUserStr = localStorage.getItem('crm-user');
  let savedUser = null;
  
  try {
    if (savedUserStr) savedUser = JSON.parse(savedUserStr);
  } catch (_) {}

  return {
    isAuthenticated: !!savedToken,
    token: savedToken,
    userInfo: savedUser,
    login: (token, user) => {
      localStorage.setItem('crm-token', token);
      localStorage.setItem('crm-user', JSON.stringify(user));
      set({ isAuthenticated: true, token, userInfo: user });
    },
    logout: () => {
      localStorage.removeItem('crm-token');
      localStorage.removeItem('crm-user');
      set({ isAuthenticated: false, token: null, userInfo: null });
    }
  };
});
