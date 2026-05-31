import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material"
import { RoleGuard } from "./shared/auth/RoleGuard.js"
import { PositionDashboard } from "./features/position/PositionDashboard.js"
import { InventoryList } from "./features/inventory/InventoryList.js"

const theme = createTheme({
  palette: { mode: "light" },
  typography: { fontFamily: '"Sarabun", "Roboto", sans-serif' },
})

export const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/position" replace />} />
        <Route
          path="/position"
          element={
            <RoleGuard roles={["MANAGER", "USER_C"]}>
              <PositionDashboard />
            </RoleGuard>
          }
        />
        <Route
          path="/inventory"
          element={
            <RoleGuard roles={["USER_A"]}>
              <InventoryList />
            </RoleGuard>
          }
        />
        {/* TODO: /trade, /transfer, /master-data */}
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
)
