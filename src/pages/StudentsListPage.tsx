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
import { fetchDistricts, fetchMunicipalities } from "../api/locations";
import type { LocationDistrict, LocationMunicipality, Student } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";
import { calculateAgeFromBirthDate, formatDateDMY } from "../utils/date";
import DateTextField from "../components/DateTextField";

type StudentLite = {
  id: string;
  nombres: string;
  apellidos: string;
  dniNie: string;
  edad: string;
  sexo: string;
  nss: string;
  fechaNacimiento: string;
  distrito: string;
  municipio: string;
  telefono: string;
  email: string;
};

type NewStudentForm = {
  first_names: string;
  last_names: string;
  dni_nie: string;
  social_security_number: string;
  birth_date: string;
  sex: "mujer" | "hombre" | "other" | "unknown";
  district_code: string;
  municipality_code: string;
  phone: string;
  email: string;
  tic: "SI" | "NO";
  status_laboral: "" | "Buscando empleo" | "Buscando mejorar empleo" | "Sin buscar empleo";
  notes: string;
};

const EMPTY_NEW_STUDENT_FORM: NewStudentForm = {
  first_names: "",
  last_names: "",
  dni_nie: "",
  social_security_number: "",
  birth_date: "",
  sex: "unknown",
  district_code: "",
  municipality_code: "",
  phone: "",
  email: "",
  tic: "NO",
  status_laboral: "",
  notes: "",
};

function sexLabel(sex?: string | null) {
  const key = (sex ?? "").toLowerCase();
  if (key === "mujer") return "Mujer";
  if (key === "hombre") return "Hombre";
  if (key === "other") return "Otro";
  return "-";
}

function parseCode(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

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
  const [districtOptions, setDistrictOptions] = React.useState<LocationDistrict[]>([]);
  const [municipalityOptions, setMunicipalityOptions] = React.useState<LocationMunicipality[]>([]);

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

  React.useEffect(() => {
    let cancel = false;
    fetchMunicipalities()
      .then((rows) => {
        if (cancel) return;
        setMunicipalityOptions(rows);
      })
      .catch(() => {
        if (cancel) return;
        setMunicipalityOptions([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  React.useEffect(() => {
    if (!newStudent.municipality_code) {
      setDistrictOptions([]);
      return;
    }

    let cancel = false;
    fetchDistricts(newStudent.municipality_code)
      .then((rows) => {
        if (cancel) return;
        setDistrictOptions(rows);
      })
      .catch(() => {
        if (cancel) return;
        setDistrictOptions([]);
      });
    return () => {
      cancel = true;
    };
  }, [newStudent.municipality_code]);

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

  const calculatedNewStudentAge = React.useMemo(
    () => calculateAgeFromBirthDate(newStudent.birth_date),
    [newStudent.birth_date]
  );

  const saveNewStudent = async () => {
    if (!newStudent.first_names.trim() || !newStudent.last_names.trim() || !newStudent.dni_nie.trim()) {
      setCreateError("Nombres, apellidos y DNI/NIE/Pasaporte son obligatorios.");
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
        sex: newStudent.sex,
        district_code: parseCode(newStudent.district_code),
        municipality_code: parseCode(newStudent.municipality_code),
        phone: newStudent.phone.trim() || null,
        email: newStudent.email.trim() || null,
        tic: newStudent.tic,
        status_laboral: newStudent.status_laboral || null,
        notes: newStudent.notes.trim() || null,
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
      const age = calculateAgeFromBirthDate(s.birth_date);
      return {
        id: String(s.id),
        nombres: s.first_names,
        apellidos: s.last_names,
        dniNie: s.dni_nie,
        edad: age != null ? String(age) : "",
        sexo: sexLabel(s.sex),
        nss: s.social_security_number ?? "",
        fechaNacimiento: formatDateDMY(s.birth_date, ""),
        distrito: s.district ?? "",
        municipio: s.municipality ?? "",
        telefono: s.phone ?? "",
        email: s.email ?? "",
      };
    });
    return mapped.filter(
      (s) =>
        hay(s.nombres) ||
        hay(s.apellidos) ||
        hay(s.dniNie) ||
        hay(s.edad) ||
        hay(s.sexo) ||
        hay(s.nss) ||
        hay(s.fechaNacimiento) ||
        hay(s.distrito) ||
        hay(s.municipio) ||
        hay(s.telefono) ||
        hay(s.email)
    );
  }, [students, q]);

  React.useEffect(() => {
    setPage(0);
  }, [q]);

  const pagedRows = React.useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const onExport = React.useCallback(() => {
    const cols: CsvColumn<StudentLite>[] = [
      { label: "Nombres", value: (r) => r.nombres },
      { label: "Apellidos", value: (r) => r.apellidos },
      { label: "DNI/NIE/Pasaporte", value: (r) => r.dniNie },
      { label: "Edad", value: (r) => r.edad },
      { label: "Sexo", value: (r) => r.sexo },
      { label: "Nº Seguridad Social", value: (r) => r.nss },
      { label: "Fecha Nacimiento", value: (r) => r.fechaNacimiento },
      { label: "Distrito", value: (r) => r.distrito },
      { label: "Municipio", value: (r) => r.municipio },
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
            placeholder="Nombres, apellidos, DNI/NIE/Pasaporte, edad, sexo, distrito, municipio, teléfono o email"
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
              <TableCell sx={{ whiteSpace: "nowrap" }}>Nombres</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Apellidos</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>DNI / NIE / Pasaporte</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Edad</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Sexo</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Distrito</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Municipio</TableCell>
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
                  <TableCell>{s.nombres}</TableCell>
                  <TableCell>{s.apellidos}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.dniNie}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.edad || "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{s.sexo || "-"}</TableCell>
                  <TableCell>{s.distrito || "-"}</TableCell>
                  <TableCell>{s.municipio || "-"}</TableCell>
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
                label="DNI / NIE / Pasaporte"
                size="small"
                fullWidth
                required
                value={newStudent.dni_nie}
                onChange={(e) => setNewStudent((s) => ({ ...s, dni_nie: e.target.value }))}
              />
            </Stack>

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
              <DateTextField
                label="Fecha nacimiento"
                size="small"
                fullWidth
                value={newStudent.birth_date}
                onChange={(nextIso) => setNewStudent((s) => ({ ...s, birth_date: nextIso }))}
                placeholder="dd/mm/aaaa"
              />
              <TextField
                label="Edad (calculada)"
                size="small"
                fullWidth
                value={calculatedNewStudentAge != null ? String(calculatedNewStudentAge) : ""}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Sexo"
                select
                size="small"
                fullWidth
                value={newStudent.sex}
                onChange={(e) =>
                  setNewStudent((s) => ({
                    ...s,
                    sex: e.target.value as NewStudentForm["sex"],
                  }))
                }
              >
                <MenuItem value="unknown">Desconocido</MenuItem>
                <MenuItem value="mujer">Mujer</MenuItem>
                <MenuItem value="hombre">Hombre</MenuItem>
                <MenuItem value="other">Otro</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Municipio"
                select
                size="small"
                fullWidth
                value={newStudent.municipality_code}
                onChange={(e) =>
                  setNewStudent((s) => ({
                    ...s,
                    municipality_code: e.target.value,
                    district_code: "",
                  }))
                }
              >
                <MenuItem value="">Sin municipio</MenuItem>
                {municipalityOptions.map((municipality) => (
                  <MenuItem key={municipality.code} value={String(municipality.code)}>
                    {municipality.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Distrito"
                select
                size="small"
                fullWidth
                disabled={!newStudent.municipality_code}
                value={newStudent.district_code}
                onChange={(e) =>
                  setNewStudent((s) => ({
                    ...s,
                    district_code: e.target.value,
                  }))
                }
              >
                <MenuItem value="">Sin distrito</MenuItem>
                {districtOptions.map((district) => (
                  <MenuItem key={district.code} value={String(district.code)}>
                    {district.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Nº Seguridad Social"
                size="small"
                fullWidth
                value={newStudent.social_security_number}
                onChange={(e) => setNewStudent((s) => ({ ...s, social_security_number: e.target.value }))}
              />
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
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Discapacidad"
                select
                size="small"
                fullWidth
                value={newStudent.tic}
                onChange={(e) =>
                  setNewStudent((s) => ({
                    ...s,
                    tic: e.target.value as NewStudentForm["tic"],
                  }))
                }
              >
                <MenuItem value="">
                  <em>Seleccione una opción</em>
                </MenuItem>
                <MenuItem value="NO">No</MenuItem>
                <MenuItem value="SI">Si</MenuItem>
              </TextField>
              <TextField
                label="Status laboral"
                select
                size="small"
                fullWidth
                value={newStudent.status_laboral}
                onChange={(e) =>
                  setNewStudent((s) => ({
                    ...s,
                    status_laboral: e.target.value as NewStudentForm["status_laboral"],
                  }))
                }
              >
                <MenuItem value="">
                  <em>Seleccione una opción</em>
                </MenuItem>
                <MenuItem value="Buscando empleo">Buscando empleo</MenuItem>
                <MenuItem value="Buscando mejorar empleo">Buscando mejorar empleo</MenuItem>
                <MenuItem value="Sin buscar empleo">Sin buscar empleo</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Observaciones"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={newStudent.notes}
              onChange={(e) => setNewStudent((s) => ({ ...s, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateStudent} disabled={createSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveNewStudent}
            disabled={
              createSaving ||
              !newStudent.first_names.trim() ||
              !newStudent.last_names.trim() ||
              !newStudent.dni_nie.trim()
            }
          >
            Crear alumno
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
