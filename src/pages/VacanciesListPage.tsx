import { useMemo, useState, useEffect } from "react";
import {
  Box, Paper, Stack, Typography, TextField, InputAdornment, MenuItem,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";
import api from "../lib/api";
import type { Vacancy, Company } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";

function statusChip(s: Vacancy["status"]) {
  return s === "open" ? <Chip label="Abierta" color="success" size="small" /> : <Chip label="Cerrada" size="small" />;
}

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function VacanciesListPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all"|"open"|"closed">("all");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Vacancy[]>("/vacancies"),
      api.get<Company[]>("/companies"),
    ])
      .then(([vRes, cRes]) => {
        if (cancel) return;
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar vacantes";
        setError(msg);
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of companies) m.set(c.id, c.name);
    return m;
  }, [companies]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = vacancies.map((v) => ({
      ...v,
      company: companyName.get(v.company_id) || `Empresa #${v.company_id}`,
    }));
    return list.filter(v =>
      (st === "all" || v.status === st) &&
      [v.title, v.company, v.sector ?? ""].some(f => f.toLowerCase().includes(term))
    );
  }, [q, st, vacancies, companyName]);

  const onExport = () => {
    const cols: CsvColumn<typeof rows[number]>[] = [
      { label: "Título", value: (r) => r.title },
      { label: "Empresa", value: (r) => r.company },
      { label: "Sector", value: (r) => r.sector ?? "" },
      { label: "Fecha creación", value: (r) => fmtDate(r.created_at) || "" },
      { label: "Estado", value: (r) => r.status },
    ];
    exportToCsv("vacantes.csv", cols, rows);
  };

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
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExport}>Exportar CSV</Button>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Título</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha creación</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.map(v => (
              <TableRow key={v.id} hover>
                <TableCell>{v.title}</TableCell>
                <TableCell>{v.company}</TableCell>
                <TableCell>{v.sector ?? "-"}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(v.created_at) || "-"}</TableCell>
                <TableCell>{statusChip(v.status)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button component={RouterLink} to={`/vacancies/${v.id}`} size="small">Ver detalle</Button>
                    <Button component={RouterLink} to="/matching" size="small" variant="outlined">Matching</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && rows.length === 0 && (
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
