import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  condominiumUsers?: Array<{
    condominiumId: string;
    role: string;
    unitId?: string;
    condominium: { id: string; name: string; logoUrl?: string };
    unit?: { identifier: string; block?: string };
  }>;
}

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedCondominiumId: string | null;
  isAuthenticated: boolean;

  setAuth: (user: UserInfo, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserInfo) => void;
  setSelectedCondominium: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedCondominiumId: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          selectedCondominiumId:
            user.condominiumUsers?.[0]?.condominium.id ?? null,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      setSelectedCondominium: (id) => set({ selectedCondominiumId: id }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          selectedCondominiumId: null,
        }),
    }),
    {
      name: 'condosync-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        selectedCondominiumId: state.selectedCondominiumId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
