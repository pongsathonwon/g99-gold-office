import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { Alert } from "@mui/material"
import type { Role } from "@gold/domain"
import { useAuthStore } from "./authStore.js"

interface RoleGuardProps {
  roles: Role[]
  children: ReactNode
}

export const RoleGuard = ({ roles, children }: RoleGuardProps) => {
  const role = useAuthStore((s) => s.role)

  if (role === null) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(role)) {
    return <Alert severity="error">ไม่มีสิทธิ์เข้าถึงหน้านี้</Alert>
  }

  return <>{children}</>
}
