import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";
import api from "../lib/api";
import type { Vacancy, Company } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";
import { formatDateDMY } from "../utils/date";

function statusChip(s: Vacancy["status"]) {
  return s === "open" ? <Chip label="Abierta" color="success" size="small" /> : <Chip label="Cerrada" size="small" />;
}

export default function VacanciesListPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "open" | "closed">("all");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    return list.filter(
      (v) =>
        (st === "all" || v.status === st) &&
        [v.title, v.company, v.sector ?? ""].some((f) => f.toLowerCase().includes(term))
    );
  }, [q, st, vacancies, companyName]);

  useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q, st]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const onExport = () => {
    const cols: CsvColumn<typeof rows[number]>[] = [
      { label: "Título", value: (r) => r.title },
      { label: "Empresa", value: (r) => r.company },
      { label: "Sector", value: (r) => r.sector ?? "" },
      { label: "Fecha creación", value: (r) => formatDateDMY(r.created_at, "") },
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
                <TableCell colSpan={6} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error &&
              pagedRows.map((v) => (
                <TableRow key={v.id} hover>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>{v.company}</TableCell>
                  <TableCell>{v.sector ?? "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(v.created_at)}</TableCell>
                  <TableCell>{statusChip(v.status)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button component={RouterLink} to={`/vacancies/${v.id}`} size="small">
                        Ver detalle
                      </Button>
                      <Button
                        component={RouterLink}
                        to={`/matching?vacancyId=${v.id}`}
                        state={{ from: "/vacancies" }}
                        size="small"
                        variant="outlined"
                      >
                        Matching
                      </Button>
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

        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Filas por página"
        />
      </Paper>
    </Box>
  );
}
