import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CondominiumOption {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  condominiumUsers?: Array<{
    condominiumId: string;
    role: string;
    unitId?: string;
    condominium: { id: string; name: string; logoUrl?: string };
    unit?: { identifier: string; block?: string };
  }>;
}

/** Deriva a lista de condomínios a partir dos vínculos do usuário. */
const condominiumsFromUser = (user: UserInfo | null): CondominiumOption[] =>
  user?.condominiumUsers?.map((cu) => cu.condominium) ?? [];

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  selectedCondominiumId: string | null;
  /**
   * Fonte única de verdade da lista de condomínios exibida nos seletores
   * (Sidebar e Header). Para SUPER_ADMIN a Sidebar substitui por toda a base
   * (GET /condominiums); para os demais reflete `user.condominiumUsers`.
   */
  condominiums: CondominiumOption[];
  isAuthenticated: boolean;
  mustEnable2FA: boolean;

  setAuth: (user: UserInfo, accessToken: string, refreshToken: string, mustEnable2FA?: boolean) => void;
  setMustEnable2FA: (v: boolean) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserInfo) => void;
  setSelectedCondominium: (id: string) => void;
  setCondominiums: (list: CondominiumOption[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      selectedCondominiumId: null,
      condominiums: [],
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
          condominiums: condominiumsFromUser(user),
        }),

      setMustEnable2FA: (v) => set({ mustEnable2FA: v }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      setSelectedCondominium: (id) => set({ selectedCondominiumId: id }),

      setCondominiums: (list) => set({ condominiums: list }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          selectedCondominiumId: null,
          condominiums: [],
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!state.selectedCondominiumId && state.user?.condominiumUsers?.[0]?.condominium?.id) {
          state.selectedCondominiumId = state.user.condominiumUsers[0].condominium.id;
        }
        // Garante a lista disponível já no primeiro render (a Sidebar
        // substitui pela base global quando SUPER_ADMIN). Não persistimos
        // a lista para evitar dados defasados — derivamos do usuário.
        if (!state.condominiums || state.condominiums.length === 0) {
          state.condominiums = condominiumsFromUser(state.user);
        }
      },
    }
  )
);
