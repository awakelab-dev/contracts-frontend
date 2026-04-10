import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import AddIcon from "@mui/icons-material/Add";
import api from "../lib/api";
import { formatDateDMY } from "../utils/date";
import DateTextField from "../components/DateTextField";

type CourseItinerary = {
  course_code: string;
  itinerary_name: string;
  formation_start_date?: string | null;
  formation_end_date?: string | null;
  formation_schedule?: string | null;
  company?: string | null;
  teacher?: string | null;
};

type CourseForm = {
  course_code: string;
  itinerary_name: string;
  formation_start_date: string;
  formation_end_date: string;
  formation_schedule: string;
  company: string;
  teacher: string;
};

const EMPTY_FORM: CourseForm = {
  course_code: "",
  itinerary_name: "",
  formation_start_date: "",
  formation_end_date: "",
  formation_schedule: "",
  company: "",
  teacher: "",
};

function toNull(value: string) {
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function CoursesPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CourseItinerary[]>([]);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [form, setForm] = useState<CourseForm>(EMPTY_FORM);

  const reload = async () => {
    const { data } = await api.get<CourseItinerary[]>("/course-itineraries");
    setRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api
      .get<CourseItinerary[]>("/course-itineraries")
      .then(({ data }) => {
        if (cancel) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e: any) => {
        if (cancel) return;
        setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al cargar cursos");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((course) =>
      [
        course.course_code,
        course.itinerary_name,
        course.formation_schedule ?? "",
        course.company ?? "",
        course.teacher ?? "",
        formatDateDMY(course.formation_start_date, ""),
        formatDateDMY(course.formation_end_date, ""),
      ].some((field) => field.toLowerCase().includes(term))
    );
  }, [rows, q]);

  useEffect(() => {
    setPage(0);
  }, [q]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredRows.slice(start, end);
  }, [filteredRows, page, rowsPerPage]);

  const openCreate = () => {
    setFormError(null);
    setEditingCourseCode(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (course: CourseItinerary) => {
    setFormError(null);
    setEditingCourseCode(course.course_code);
    setForm({
      course_code: course.course_code,
      itinerary_name: course.itinerary_name ?? "",
      formation_start_date: fmtDate(course.formation_start_date),
      formation_end_date: fmtDate(course.formation_end_date),
      formation_schedule: course.formation_schedule ?? "",
      company: course.company ?? "",
      teacher: course.teacher ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setFormError(null);
    setEditingCourseCode(null);
    setForm(EMPTY_FORM);
  };

  const saveCourse = async () => {
    if (!form.course_code.trim() || !form.itinerary_name.trim()) {
      setFormError("Código del curso y nombre del curso son obligatorios.");
      return;
    }

    const payload = {
      course_code: form.course_code,
      itinerary_name: form.itinerary_name,
      formation_start_date: toNull(form.formation_start_date),
      formation_end_date: toNull(form.formation_end_date),
      formation_schedule: toNull(form.formation_schedule),
      company: toNull(form.company),
      teacher: toNull(form.teacher),
    };

    try {
      setSaving(true);
      setFormError(null);
      if (editingCourseCode) {
        await api.put(`/course-itineraries/${encodeURIComponent(editingCourseCode)}`, payload);
      } else {
        await api.post("/course-itineraries", payload);
      }
      await reload();
      closeDialog();
    } catch (e: any) {
      setFormError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al guardar curso");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Cursos</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField
            size="small"
            placeholder="Buscar por código, nombre, horario, empresa o docente"
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
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
            Agregar curso
          </Button>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código curso</TableCell>
              <TableCell>Nombre del curso</TableCell>
              <TableCell>Inicio</TableCell>
              <TableCell>Fin</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Docente</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error &&
              pagedRows.map((course) => (
                <TableRow
                  key={course.course_code}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => openEdit(course)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openEdit(course);
                  }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{course.course_code}</TableCell>
                  <TableCell>{course.itinerary_name || "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(course.formation_start_date)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(course.formation_end_date)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{course.formation_schedule || "-"}</TableCell>
                  <TableCell>{course.company || "-"}</TableCell>
                  <TableCell>{course.teacher || "-"}</TableCell>
                </TableRow>
              ))}
            {!loading && !error && filteredRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filteredRows.length}
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingCourseCode ? "Editar curso" : "Agregar curso"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {formError && (
              <Alert severity="error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Código del curso"
                size="small"
                fullWidth
                required
                value={form.course_code}
                InputProps={{ readOnly: !!editingCourseCode }}
                onChange={(e) => setForm((prev) => ({ ...prev, course_code: e.target.value }))}
              />
              <TextField
                label="Nombre del curso"
                size="small"
                fullWidth
                required
                value={form.itinerary_name}
                onChange={(e) => setForm((prev) => ({ ...prev, itinerary_name: e.target.value }))}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <DateTextField
                label="Fecha inicio formación"
                size="small"
                fullWidth
                value={form.formation_start_date}
                onChange={(nextIso) => setForm((prev) => ({ ...prev, formation_start_date: nextIso }))}
                placeholder="dd/mm/aaaa"
              />
              <DateTextField
                label="Fecha fin formación"
                size="small"
                fullWidth
                value={form.formation_end_date}
                onChange={(nextIso) => setForm((prev) => ({ ...prev, formation_end_date: nextIso }))}
                placeholder="dd/mm/aaaa"
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Horario formación"
                size="small"
                fullWidth
                value={form.formation_schedule}
                onChange={(e) => setForm((prev) => ({ ...prev, formation_schedule: e.target.value }))}
              />
              <TextField
                label="Empresa"
                size="small"
                fullWidth
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            </Stack>

            <TextField
              label="Docente"
              size="small"
              fullWidth
              value={form.teacher}
              onChange={(e) => setForm((prev) => ({ ...prev, teacher: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveCourse} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
