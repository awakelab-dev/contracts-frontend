import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
import DownloadIcon from "@mui/icons-material/Download";
import api from "../lib/api";
import type { Interview, Student } from "../types";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";
import { formatDateDMY, toLocalDate } from "../utils/date";
import DateTextField from "../components/DateTextField";

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = toLocalDate(s) ?? new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(s?: string | null): string {
  const v = formatDateDMY(s, "");
  return v || s || "-";
}

function interviewStatusChip(s?: Interview["status"] | null) {
  switch (s ?? "sent") {
    case "attended":
      return <Chip label="Asistida" color="success" size="small" />;
    case "no_show":
      return <Chip label="No asistió" color="warning" size="small" />;
    case "sent":
    default:
      return <Chip label="Enviada" size="small" />;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState<{
    id?: number;
    student_id: string;
    interview_date: string;
    status: "sent" | "attended" | "no_show";
    place: string;
    notes: string;
  }>({
    student_id: "",
    interview_date: "",
    status: "sent",
    place: "",
    notes: "",
  });

  async function refreshInterviews() {
    const { data } = await api.get<Interview[]>("/interviews");
    setInterviews(Array.isArray(data) ? data : []);
  }

  function openCreateInterview() {
    setActionError(null);
    setActionOk(null);
    setInterviewForm({
      student_id: "",
      interview_date: "",
      status: "sent",
      place: "",
      notes: "",
    });
    setDialogOpen(true);
  }

  function openEditInterview(i: Interview) {
    setActionError(null);
    setActionOk(null);
    setInterviewForm({
      id: i.id,
      student_id: String(i.student_id),
      interview_date: i.interview_date ? String(i.interview_date).slice(0, 10) : "",
      status: (i.status ?? "sent") as "sent" | "attended" | "no_show",
      place: i.place ?? "",
      notes: i.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function saveInterview() {
    const studentId = Number(interviewForm.student_id);
    if (!interviewForm.interview_date) {
      setActionError("La fecha es obligatoria");
      return;
    }
    if (!interviewForm.id && !Number.isFinite(studentId)) {
      setActionError("El alumno es obligatorio");
      return;
    }

    try {
      setActionError(null);
      setActionOk(null);
      setInterviewSaving(true);

      if (interviewForm.id) {
        await api.put(`/interviews/${interviewForm.id}`, {
          place: interviewForm.place || null,
          interview_date: interviewForm.interview_date,
          status: interviewForm.status,
          notes: interviewForm.notes || null,
        });
        setActionOk("Entrevista actualizada");
      } else {
        await api.post(`/interviews`, {
          student_id: studentId,
          place: interviewForm.place || null,
          interview_date: interviewForm.interview_date,
          status: interviewForm.status,
          notes: interviewForm.notes || null,
        });
        setActionOk("Entrevista creada");
      }

      await refreshInterviews();
      setDialogOpen(false);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar entrevista");
    } finally {
      setInterviewSaving(false);
    }
  }

  async function deleteInterview(interviewId: number) {
    const ok = window.confirm("¿Eliminar esta entrevista?");
    if (!ok) return;

    try {
      setActionError(null);
      setActionOk(null);
      await api.delete(`/interviews/${interviewId}`);
      await refreshInterviews();
      setActionOk("Entrevista eliminada");
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar entrevista");
    }
  }

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
        student_id: i.student_id,
        status: (i.status ?? "sent") as "sent" | "attended" | "no_show",
        studentName: nameById.get(i.student_id) || `Alumno #${i.student_id}`,
        interview_date: i.interview_date,
        place: i.place ?? "",
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
      { label: "Estado", value: (r) => r.status },
      { label: "Lugar", value: (r) => r.place || "-" },
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
          <Button variant="contained" size="small" onClick={openCreateInterview}>
            Crear entrevista
          </Button>
        </Stack>
      </Stack>

      {actionOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionOk(null)}>
          {actionOk}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alumno</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Lugar</TableCell>
              <TableCell>Notas</TableCell>
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
            {!loading &&
              !error &&
              pagedRows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{formatDate(r.interview_date)}</TableCell>
                  <TableCell>{interviewStatusChip(r.status)}</TableCell>
                  <TableCell>{r.place || "-"}</TableCell>
                  <TableCell>{r.notes}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        onClick={() =>
                          openEditInterview({
                            id: r.id,
                            student_id: r.student_id,
                            interview_date: r.interview_date,
                            status: r.status,
                            place: r.place || null,
                            notes: r.notes || null,
                          })
                        }
                      >
                        Editar
                      </Button>
                      <Button size="small" color="error" onClick={() => deleteInterview(r.id)}>
                        Eliminar
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{interviewForm.id ? "Editar entrevista" : "Crear entrevista"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Alumno"
              select
              size="small"
              fullWidth
              disabled={!!interviewForm.id}
              value={interviewForm.student_id}
              onChange={(e) => setInterviewForm((f) => ({ ...f, student_id: e.target.value }))}
            >
              {students.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {`${s.first_names} ${s.last_names}`.trim()}
                </MenuItem>
              ))}
            </TextField>

            <DateTextField
              label="Fecha"
              size="small"
              fullWidth
              value={interviewForm.interview_date}
              onChange={(nextIso) => setInterviewForm((f) => ({ ...f, interview_date: nextIso }))}
              placeholder="dd/mm/aaaa"
            />

            <TextField
              label="Estado"
              select
              size="small"
              fullWidth
              value={interviewForm.status}
              onChange={(e) => setInterviewForm((f) => ({ ...f, status: e.target.value as "sent" | "attended" | "no_show" }))}
            >
              <MenuItem value="sent">Enviada</MenuItem>
              <MenuItem value="attended">Asistida</MenuItem>
              <MenuItem value="no_show">No asistió</MenuItem>
            </TextField>

            <TextField
              label="Lugar"
              size="small"
              fullWidth
              value={interviewForm.place}
              onChange={(e) => setInterviewForm((f) => ({ ...f, place: e.target.value }))}
            />

            <TextField
              label="Notas"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={interviewForm.notes}
              onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={interviewSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveInterview}
            disabled={interviewSaving || !interviewForm.interview_date || (!interviewForm.id && !interviewForm.student_id)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
