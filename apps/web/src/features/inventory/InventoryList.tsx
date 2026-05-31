import { Box, CircularProgress, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { apiClient } from "../../shared/api/client.js"
import type { InventoryLot } from "@gold/contracts/inventory"

export const InventoryList = () => {
  const [searchParams] = useSearchParams()

  // 7-dimension filter is serialised in URL — bookmarkable
  const filter = Object.fromEntries(searchParams.entries())

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "lots", filter],
    queryFn: () => {
      const qs = new URLSearchParams(filter).toString()
      return apiClient.get<InventoryLot[]>(`/inventory/lots${qs ? `?${qs}` : ""}`)
    },
  })

  if (isLoading) return <CircularProgress />

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        คลังสินค้า
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {data?.length ?? 0} รายการ
      </Typography>
      {/* Filter bar and table to be built here */}
    </Box>
  )
}
