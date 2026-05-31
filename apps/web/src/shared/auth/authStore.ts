import { create } from "zustand"
import type { Role } from "@gold/domain"

interface AuthState {
  token: string | null
  userId: string | null
  role: Role | null
  branchId: string | null
  setAuth: (token: string, userId: string, role: Role, branchId: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  userId: null,
  role: null,
  branchId: null,
  setAuth: (token, userId, role, branchId) => {
    localStorage.setItem("token", token)
    set({ token, userId, role, branchId })
  },
  clearAuth: () => {
    localStorage.removeItem("token")
    set({ token: null, userId: null, role: null, branchId: null })
  },
}))
