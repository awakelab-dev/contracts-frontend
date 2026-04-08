import { useEffect, useMemo, useState } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../lib/api";
import { fetchDistricts, fetchMunicipalities } from "../api/locations";
import type { LocationDistrict, LocationMunicipality, Student } from "../types";
import DateTextField from "../components/DateTextField";
import { calculateAgeFromBirthDate } from "../utils/date";

type StudentForm = {
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
  notes: string;
};

const EMPTY_FORM: StudentForm = {
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
  notes: "",
};

function parseCode(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toForm(student: Student): StudentForm {
  return {
    first_names: student.first_names || "",
    last_names: student.last_names || "",
    dni_nie: student.dni_nie || "",
    social_security_number: student.social_security_number || "",
    birth_date: student.birth_date ? String(student.birth_date).slice(0, 10) : "",
    sex: (student.sex || "unknown") as StudentForm["sex"],
    district_code: student.district_code != null ? String(student.district_code) : "",
    municipality_code: student.municipality_code != null ? String(student.municipality_code) : "",
    phone: student.phone || "",
    email: student.email || "",
    notes: student.notes || "",
  };
}

export default function StudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isCreateMode = !id || id === "new";
  const [form, setForm] = useState<StudentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [districtOptions, setDistrictOptions] = useState<LocationDistrict[]>([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<LocationMunicipality[]>([]);

  useEffect(() => {
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

  useEffect(() => {
    if (!form.municipality_code) {
      setDistrictOptions([]);
      return;
    }
    let cancel = false;
    fetchDistricts(form.municipality_code)
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
  }, [form.municipality_code]);

  useEffect(() => {
    if (isCreateMode) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return;
    }

    let cancel = false;
    setLoading(true);
    setError(null);

    api
      .get<Student>(`/students/${id}`)
      .then(({ data }) => {
        if (cancel) return;
        setForm(toForm(data));
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Error al cargar alumno";
        setError(msg);
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [id, isCreateMode]);

  const canSave = useMemo(
    () =>
      !!form.first_names.trim() &&
      !!form.last_names.trim() &&
      !!form.dni_nie.trim(),
    [form]
  );
  const calculatedAge = useMemo(() => calculateAgeFromBirthDate(form.birth_date), [form.birth_date]);

  const save = async () => {
    if (!canSave) return;

    try {
      setError(null);
      setSaving(true);

      const payload = {
        first_names: form.first_names.trim(),
        last_names: form.last_names.trim(),
        dni_nie: form.dni_nie.trim(),
        social_security_number: form.social_security_number.trim() || null,
        birth_date: form.birth_date || null,
        sex: form.sex,
        district_code: parseCode(form.district_code),
        municipality_code: parseCode(form.municipality_code),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isCreateMode) {
        const { data } = await api.post<{ studentId?: number }>("/students", payload);
        const createdId = Number(data?.studentId);
        if (Number.isFinite(createdId) && createdId > 0) {
          navigate(`/students/${createdId}`, { state: { from: "/students" } });
          return;
        }
        navigate("/students");
        return;
      }

      await api.put(`/students/${id}`, payload);
      navigate(`/students/${id}`, { state: { from: "/students" } });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Error al guardar alumno";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography>Cargando alumno…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{isCreateMode ? "Nuevo alumno" : "Editar alumno"}</Typography>
        <Button component={RouterLink} to="/students">
          Volver
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          DATOS PERSONALES
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="NOMBRE"
              size="small"
              required
              value={form.first_names}
              onChange={(e) => setForm((s) => ({ ...s, first_names: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="APELLIDOS"
              size="small"
              required
              value={form.last_names}
              onChange={(e) => setForm((s) => ({ ...s, last_names: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="DNI / NIE / PASAPORTE"
              size="small"
              required
              value={form.dni_nie}
              onChange={(e) => setForm((s) => ({ ...s, dni_nie: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="Nº SEGURIDAD SOCIAL"
              size="small"
              value={form.social_security_number}
              onChange={(e) => setForm((s) => ({ ...s, social_security_number: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <DateTextField
              fullWidth
              label="FECHA NACIMIENTO"
              size="small"
              value={form.birth_date}
              onChange={(nextIso) => setForm((s) => ({ ...s, birth_date: nextIso }))}
              placeholder="dd/mm/aaaa"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="EDAD (CALCULADA)"
              size="small"
              value={calculatedAge != null ? String(calculatedAge) : ""}
              InputProps={{ readOnly: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              select
              label="SEXO"
              size="small"
              value={form.sex}
              onChange={(e) => setForm((s) => ({ ...s, sex: e.target.value as StudentForm["sex"] }))}
            >
              <MenuItem value="unknown">Desconocido</MenuItem>
              <MenuItem value="mujer">Mujer</MenuItem>
              <MenuItem value="hombre">Hombre</MenuItem>
              <MenuItem value="other">Otro</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              select
              label="MUNICIPIO"
              size="small"
              value={form.municipality_code}
              onChange={(e) =>
                setForm((s) => ({
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              select
              label="DISTRITO"
              size="small"
              disabled={!form.municipality_code}
              value={form.district_code}
              onChange={(e) =>
                setForm((s) => ({
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
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="TLF CONTACTO"
              size="small"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              label="E-MAIL"
              size="small"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="OBSERVACIONES"
              size="small"
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={save} disabled={saving || !canSave}>
          {isCreateMode ? "Crear alumno" : "Guardar cambios"}
        </Button>
        <Button component={RouterLink} to="/students" disabled={saving}>
          Cancelar
        </Button>
      </Stack>
    </Box>
  );
}
