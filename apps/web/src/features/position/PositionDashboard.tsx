import { Box, CircularProgress, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "../../shared/api/client.js"
import type { PeriodNet } from "@gold/contracts/position"

export const PositionDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["position", "current"],
    queryFn: () => apiClient.get<PeriodNet>("/position/current"),
  })

  if (isLoading) return <CircularProgress />

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Position ปัจจุบัน
      </Typography>
      {data && (
        <Box display="flex" gap={4} mt={2}>
          <Box>
            <Typography variant="caption">Net Cash (THB)</Typography>
            <Typography variant="h6">{data.netCashThb.toLocaleString("th-TH")}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Net Gold 96.5% (GB)</Typography>
            <Typography variant="h6">{data.netGold965Gb.toFixed(3)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption">Net Gold 99.99% (g)</Typography>
            <Typography variant="h6">{data.netGold9999Grams.toFixed(3)}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
