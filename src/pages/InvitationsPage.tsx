import { useMemo, useState } from "react";
import {
  Box, Paper, Stack, Typography, TextField, InputAdornment, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";

type Invitation = {
  id: number;
  studentId: number;
  studentName: string;
  vacancyId: number;
  vacancyTitle: string;
  company: string;
  status: "sent" | "accepted" | "rejected" | "expired";
  sentAt: string;
  respondedAt?: string;
};

const DATA: Invitation[] = [
  { id: 1, studentId: 1, studentName: "ANTHONY J. BRUFAU", vacancyId: 1, vacancyTitle: "Camarero/a terraza", company: "R. PARAGUAS", status: "sent", sentAt: "2025-12-20" },
  { id: 2, studentId: 4, studentName: "JEROME M. MASONGSONG", vacancyId: 2, vacancyTitle: "Runner", company: "TATEL", status: "accepted", sentAt: "2025-12-18", respondedAt: "2025-12-19" },
  { id: 3, studentId: 2, studentName: "DELIA F. LÓPEZ", vacancyId: 3, vacancyTitle: "Dependiente/a", company: "SNIPES ROPA", status: "rejected", sentAt: "2025-12-17", respondedAt: "2025-12-18" },
  { id: 4, studentId: 3, studentName: "ESTEFANY Q. IBÁÑEZ", vacancyId: 3, vacancyTitle: "Dependiente/a", company: "SNIPES ROPA", status: "expired", sentAt: "2025-12-10" },
];

function statusChip(s: Invitation["status"]) {
  switch (s) {
    case "sent": return <Chip label="Enviada" size="small" />;
    case "accepted": return <Chip label="Aceptada" color="success" size="small" />;
    case "rejected": return <Chip label="Rechazada" color="warning" size="small" />;
    case "expired": return <Chip label="Expirada" size="small" variant="outlined" />;
  }
}

export default function InvitationsPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | Invitation["status"]>("all");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return DATA.filter(inv =>
      (st === "all" || inv.status === st) &&
      [inv.studentName, inv.vacancyTitle, inv.company].some(f => f.toLowerCase().includes(term))
    );
  }, [q, st]);

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" mb={2}>
        <Typography variant="h5">Invitaciones</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Buscar por alumno, vacante o empresa"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={st}
            onChange={(e) => setSt(e.target.value as any)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="sent">Enviadas</MenuItem>
            <MenuItem value="accepted">Aceptadas</MenuItem>
            <MenuItem value="rejected">Rechazadas</MenuItem>
            <MenuItem value="expired">Expiradas</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alumno</TableCell>
              <TableCell>Vacante</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Enviada</TableCell>
              <TableCell>Respuesta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(inv => (
              <TableRow key={inv.id} hover>
                <TableCell>{inv.studentName}</TableCell>
                <TableCell>{inv.vacancyTitle}</TableCell>
                <TableCell>{inv.company}</TableCell>
                <TableCell>{statusChip(inv.status)}</TableCell>
                <TableCell>{inv.sentAt}</TableCell>
                <TableCell>{inv.respondedAt ?? "-"}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button component={RouterLink} to={`/students/${inv.studentId}`} size="small">Ver alumno</Button>
                    <Button component={RouterLink} to={`/vacancies/${inv.vacancyId}`} size="small" variant="outlined">Ver vacante</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay invitaciones que coincidan con el filtro
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}