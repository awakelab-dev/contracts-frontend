import React from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Student } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";
import { formatDateDMY } from "../utils/date";
import DateTextField from "../components/DateTextField";

type StudentLite = {
  id: string;
  expediente: string;
  nombres: string;
  apellidos: string;
  dniNie: string;
  nss: string;
  fechaNacimiento: string;
  distrito: string;
  telefono: string;
  email: string;
};

type NewStudentForm = {
  first_names: string;
  last_names: string;
  dni_nie: string;
  social_security_number: string;
  birth_date: string;
  district: string;
  phone: string;
  email: string;
  employment_status: "unemployed" | "employed" | "improved" | "unknown";
};

const EMPTY_NEW_STUDENT_FORM: NewStudentForm = {
  first_names: "",
  last_names: "",
  dni_nie: "",
  social_security_number: "",
  birth_date: "",
  district: "",
  phone: "",
  email: "",
  employment_status: "unknown",
};

export default function StudentsListPage() {
  const navigate = useNavigate();

  const [q, setQ] = React.useState("");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createSaving, setCreateSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [newStudent, setNewStudent] = React.useState<NewStudentForm>(EMPTY_NEW_STUDENT_FORM);

  React.useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api
      .get<Student[]>("/students")
      .then(({ data }) => {
        if (cancel) return;
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar alumnos";
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

  const openCreateStudent = () => {
    setCreateError(null);
    setNewStudent(EMPTY_NEW_STUDENT_FORM);
    setCreateOpen(true);
  };

  const closeCreateStudent = () => {
    if (createSaving) return;
    setCreateOpen(false);
    setCreateError(null);
    setNewStudent(EMPTY_NEW_STUDENT_FORM);
  };

  const saveNewStudent = async () => {
    if (!newStudent.first_names.trim() || !newStudent.last_names.trim() || !newStudent.dni_nie.trim()) {
      setCreateError("Nombres, apellidos y DNI/NIE son obligatorios.");
      return;
    }

    try {
      setCreateError(null);
      setCreateSaving(true);
      const { data } = await api.post<{ studentId?: number }>("/students", {
        first_names: newStudent.first_names.trim(),
        last_names: newStudent.last_names.trim(),
        dni_nie: newStudent.dni_nie.trim(),
        social_security_number: newStudent.social_security_number.trim() || null,
        birth_date: newStudent.birth_date || null,
        district: newStudent.district.trim() || null,
        phone: newStudent.phone.trim() || null,
        email: newStudent.email.trim() || null,
        employment_status: newStudent.employment_status,
      });

      const createdId = Number(data?.studentId);
      setCreateOpen(false);
      if (Number.isFinite(createdId) && createdId > 0) {
        navigate(`/students/${createdId}`, { state: { from: "/students" } });
        return;
      }

      window.location.reload();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Error al crear alumno";
      setCreateError(msg);
    } finally {
      setCreateSaving(false);
    }
  };

  const rows = React.useMemo(() => {
    const hay = (v?: string) => (v || "").toLowerCase().includes(q.toLowerCase());
    const mapped: StudentLite[] = students.map((s) => {
      return {
        id: String(s.id),
        expediente: String(s.id),
        nombres: s.first_names,
        apellidos: s.last_names,
        dniNie: s.dni_nie,
        nss: s.social_security_number ?? "",
        fechaNacimiento: formatDateDMY(s.birth_date, ""),
        distrito: s.district ?? "",
        telefono: s.phone ?? "",
        email: s.email ?? "",
      };
    });
    return mapped.filter(
      (s) =>
        hay(s.expediente) ||
        hay(s.nombres) ||
        hay(s.apellidos) ||
        hay(s.dniNie) ||
        hay(s.nss) ||
        hay(s.fechaNacimiento) ||
        hay(s.distrito) ||
        hay(s.telefono) ||
        hay(s.email)
    );
  }, [students, q]);

  React.useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q]);

  const pagedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const onExport = React.useCallback(() => {
    const cols: CsvColumn<StudentLite>[] = [
      { label: "Nº Expediente", value: (r) => r.expediente },
      { label: "Nombres", value: (r) => r.nombres },
      { label: "Apellidos", value: (r) => r.apellidos },
      { label: "DNI/NIE", value: (r) => r.dniNie },
      { label: "Nº Seguridad Social", value: (r) => r.nss },
      { label: "Fecha Nacimiento", value: (r) => r.fechaNacimiento },
      { label: "Distrito", value: (r) => r.distrito },
      { label: "Teléfono", value: (r) => r.telefono },
      { label: "Email", value: (r) => r.email },
    ];
    exportToCsv("alumnos.csv", cols, rows);
  }, [rows]);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Alumnos
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            size="small"
            label="Buscar"
            placeholder="Expediente, nombres, apellidos, DNI/NIE, NSS, distrito, teléfono o email"
          />
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExport}>
            Exportar CSV
          </Button>
          <Button variant="contained" size="small" onClick={openCreateStudent}>
            Nuevo alumno
          </Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Nº Exp.</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Nombres</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Apellidos</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>DNI / NIE</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Nº Seg. Soc.</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha Nac.</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Distrito</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Teléfono</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Email</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error &&
              pagedRows.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/students/${s.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/students/${s.id}`);
                  }}
                >
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.expediente}</TableCell>
                  <TableCell>{s.nombres}</TableCell>
                  <TableCell>{s.apellidos}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.dniNie}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.nss || "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.fechaNacimiento || "-"}</TableCell>
                  <TableCell>{s.distrito || "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.telefono || "-"}</TableCell>
                  <TableCell>{s.email || "-"}</TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay resultados
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

      <Dialog open={createOpen} onClose={closeCreateStudent} fullWidth maxWidth="md">
        <DialogTitle>Nuevo alumno</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {createError && <Alert severity="error">{createError}</Alert>}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Nombres"
                size="small"
                fullWidth
                required
                value={newStudent.first_names}
                onChange={(e) => setNewStudent((s) => ({ ...s, first_names: e.target.value }))}
              />
              <TextField
                label="Apellidos"
                size="small"
                fullWidth
                required
                value={newStudent.last_names}
                onChange={(e) => setNewStudent((s) => ({ ...s, last_names: e.target.value }))}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="DNI / NIE"
                size="small"
                fullWidth
                required
                value={newStudent.dni_nie}
                onChange={(e) => setNewStudent((s) => ({ ...s, dni_nie: e.target.value }))}
              />
              <TextField
                label="Nº Seguridad Social"
                size="small"
                fullWidth
                value={newStudent.social_security_number}
                onChange={(e) => setNewStudent((s) => ({ ...s, social_security_number: e.target.value }))}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <DateTextField
                label="Fecha nacimiento"
                size="small"
                fullWidth
                value={newStudent.birth_date}
                onChange={(nextIso) => setNewStudent((s) => ({ ...s, birth_date: nextIso }))}
                placeholder="dd/mm/aaaa"
              />
              <TextField
                label="Distrito"
                size="small"
                fullWidth
                value={newStudent.district}
                onChange={(e) => setNewStudent((s) => ({ ...s, district: e.target.value }))}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Teléfono"
                size="small"
                fullWidth
                value={newStudent.phone}
                onChange={(e) => setNewStudent((s) => ({ ...s, phone: e.target.value }))}
              />
              <TextField
                label="Email"
                size="small"
                type="email"
                fullWidth
                value={newStudent.email}
                onChange={(e) => setNewStudent((s) => ({ ...s, email: e.target.value }))}
              />
            </Stack>

            <TextField
              label="Situación laboral"
              select
              size="small"
              fullWidth
              value={newStudent.employment_status}
              onChange={(e) =>
                setNewStudent((s) => ({
                  ...s,
                  employment_status: e.target.value as NewStudentForm["employment_status"],
                }))
              }
            >
              <MenuItem value="unknown">Desconocido</MenuItem>
              <MenuItem value="unemployed">Desempleado</MenuItem>
              <MenuItem value="employed">Empleado</MenuItem>
              <MenuItem value="improved">Buscando mejor opción</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateStudent} disabled={createSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveNewStudent}
            disabled={createSaving || !newStudent.first_names.trim() || !newStudent.last_names.trim() || !newStudent.dni_nie.trim()}
          >
            Crear alumno
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
