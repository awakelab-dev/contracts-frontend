import { useMemo, useState } from "react";
import {
  Box, Paper, Stack, Typography, TextField, InputAdornment, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";

type Vacancy = {
  id: number;
  title: string;
  company: string;
  sector: string;
  status: "open" | "closed";
  deadline?: string; // ISO
};

const DATA: Vacancy[] = [
  { id: 1, title: "Camarero/a terraza fin de semana", company: "R. PARAGUAS", sector: "Hostelería", status: "open", deadline: "2026-01-31" },
  { id: 2, title: "Runner restaurante alta gama", company: "TATEL", sector: "Hostelería", status: "open", deadline: "2026-02-10" },
  { id: 3, title: "Dependiente/a tienda urbana", company: "SNIPES ROPA", sector: "Comercio", status: "open" },
  { id: 4, title: "Operario/a de obra", company: "CONSTRUCCIONES GAHERJO, S.L.", sector: "Construcción", status: "closed" },
  { id: 5, title: "Ayudante de barra", company: "Restaurante Jose Luis", sector: "Hostelería", status: "open" },
  { id: 6, title: "Ayudante de sala", company: "R. PARAGUAS", sector: "Hostelería", status: "closed" },
];

function statusChip(s: Vacancy["status"]) {
  return s === "open"
    ? <Chip label="Abierta" color="success" size="small" />
    : <Chip label="Cerrada" size="small" />;
}

export default function VacanciesListPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all"|"open"|"closed">("all");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return DATA.filter(v =>
      (st === "all" || v.status === st) &&
      [v.title, v.company, v.sector].some(f => f.toLowerCase().includes(term))
    );
  }, [q, st]);

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" mb={2}>
        <Typography variant="h5">Vacantes</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Buscar por título, empresa o sector"
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
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="open">Abiertas</MenuItem>
            <MenuItem value="closed">Cerradas</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Fecha límite</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(v => (
              <TableRow key={v.id} hover>
                <TableCell>{v.title}</TableCell>
                <TableCell>{v.company}</TableCell>
                <TableCell>{v.sector}</TableCell>
                <TableCell>{v.deadline ?? "-"}</TableCell>
                <TableCell>{statusChip(v.status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button component={RouterLink} to={`/vacancies/${v.id}`} size="small">Ver detalle</Button>
                    <Button component={RouterLink} to="/matching" size="small" variant="outlined">Matching</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay vacantes que coincidan con el filtro
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}