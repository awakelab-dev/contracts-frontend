import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  InputAdornment,
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
import DownloadIcon from "@mui/icons-material/Download";
import api from "../lib/api";
import type { Interview, Student } from "../types";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(s?: string | null): string {
  const d = parseDate(s);
  if (!d) return s || "-";
  try {
    return d.toLocaleDateString();
  } catch {
    return s || "-";
  }
}

export default function InterviewsListPage() {
  const [q, setQ] = useState("");
  const [onlyUpcoming, setOnlyUpcoming] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Interview[]>("/interviews"),
      api.get<Student[]>("/students"),
    ])
      .then(([iRes, sRes]) => {
        if (cancel) return;
        setInterviews(Array.isArray(iRes.data) ? iRes.data : []);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar entrevistas";
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

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const today = new Date();
    const nameById = new Map<number, string>();
    students.forEach((s) => nameById.set(s.id, `${s.first_names} ${s.last_names}`.trim()));
    return interviews
      .map((i) => ({
        id: i.id,
        studentName: nameById.get(i.student_id) || `Alumno #${i.student_id}`,
        interview_date: i.interview_date,
        place: i.place ?? "-",
        notes: i.notes ?? "",
      }))
      .filter((r) => (term ? r.studentName.toLowerCase().includes(term) : true))
      .filter((r) => {
        if (!onlyUpcoming) return true;
        const d = parseDate(r.interview_date);
        if (!d) return false;
        // próximas = hoy o futuras
        const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dMid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return dMid.getTime() >= todayMid.getTime();
      })
      .sort((a, b) => {
        const da = parseDate(a.interview_date)?.getTime() || 0;
        const db = parseDate(b.interview_date)?.getTime() || 0;
        return db - da; // desc
      });
  }, [interviews, students, q, onlyUpcoming]);

  useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q, onlyUpcoming]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const onExport = () => {
    const cols: CsvColumn<typeof rows[number]>[] = [
      { label: "Nombre Alumno", value: (r) => r.studentName },
      { label: "Fecha Entrevista", value: (r) => formatDate(r.interview_date) },
      { label: "Lugar", value: (r) => r.place },
      { label: "Notas", value: (r) => r.notes },
    ];
    exportToCsv("entrevistas.csv", cols, rows);
  };

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" mb={2}>
        <Typography variant="h5">Entrevistas</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
          <TextField
            size="small"
            placeholder="Buscar por nombre de alumno"
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
          <FormControlLabel
            control={<Checkbox checked={onlyUpcoming} onChange={(e) => setOnlyUpcoming(e.target.checked)} />}
            label="Próximas entrevistas"
          />
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExport}>Exportar CSV</Button>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alumno</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Lugar</TableCell>
              <TableCell>Notas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={4} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              pagedRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{formatDate(r.interview_date)}</TableCell>
                  <TableCell>{r.place}</TableCell>
                  <TableCell>{r.notes}</TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay entrevistas
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
