import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
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
  mustEnable2FA: boolean;

  setAuth: (user: UserInfo, accessToken: string, refreshToken: string, mustEnable2FA?: boolean) => void;
  setMustEnable2FA: (v: boolean) => void;
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
      mustEnable2FA: false,

      setAuth: (user, accessToken, refreshToken, mustEnable2FA = false) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          mustEnable2FA,
          selectedCondominiumId:
            user.condominiumUsers?.[0]?.condominium.id ?? null,
        }),

      setMustEnable2FA: (v) => set({ mustEnable2FA: v }),

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
          mustEnable2FA: false,
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
        mustEnable2FA: state.mustEnable2FA,
      }),
    }
  )
);
