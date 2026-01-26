import React from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../lib/api";
import type { Student } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";

type StudentLite = {
  id: string;
  expediente: string;
  nombre: string;
  apellidos: string;
  dniNie: string;
  distrito: string;
  cursoFormacion: string;
  situacionLaboral: string;
};

const splitName = (full: string) => {
  const parts = (full || "").trim().split(/\s+/);
  const nombre = parts.shift() || "";
  const apellidos = parts.join(" ");
  return { nombre, apellidos };
};

export default function StudentsListPage() {
  const [q, setQ] = React.useState("");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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

  const rows = React.useMemo(() => {
    const hay = (v?: string) => (v || "").toLowerCase().includes(q.toLowerCase());
    const mapped: StudentLite[] = students.map((s) => {
      const { nombre, apellidos } = splitName(s.full_name);
      return {
        id: String(s.id),
        expediente: String(s.id),
        nombre,
        apellidos,
        dniNie: s.dni_nie,
        distrito: "",
        cursoFormacion: s.course_code,
        situacionLaboral: s.employment_status,
      };
    });
    return mapped.filter(
      (s) =>
        hay(s.expediente) ||
        hay(s.nombre) ||
        hay(s.apellidos) ||
        hay(s.dniNie) ||
        hay(s.distrito) ||
        hay(s.cursoFormacion) ||
        hay(s.situacionLaboral)
    );
  }, [students, q]);

  const onExport = React.useCallback(() => {
    const cols: CsvColumn<StudentLite>[] = [
      { label: "Nº Expediente", value: (r) => r.expediente },
      { label: "Nombre", value: (r) => r.nombre },
      { label: "Apellidos", value: (r) => r.apellidos },
      { label: "DNI/NIE", value: (r) => r.dniNie },
      { label: "Distrito", value: (r) => r.distrito },
      { label: "Curso Formación", value: (r) => r.cursoFormacion },
      { label: "Situación Laboral", value: (r) => r.situacionLaboral },
    ];
    exportToCsv("alumnos.csv", cols, rows);
  }, [rows]);

  /*const renderSituacion = (v: string) => {
    const l = v.toLowerCase();
    if (l.startsWith("trabaj")) return <Chip size="small" color="success" label={v} />;
    if (l.startsWith("mejora")) return <Chip size="small" color="primary" variant="outlined" label={v} />;
    if (l.startsWith("sin")) return <Chip size="small" color="warning" label={v} />;
    return <Chip size="small" label={v} />;
  };*/

  // En StudentsListPage.tsx
const renderSituacion = (v: string) => {
  const l = (v || "").toLowerCase();
  
  // Verde para los que ya están trabajando
  if (l === "employed") return <Chip size="small" color="success" label="Empleado" />;
  
  // Azul para los que están mejorando
  if (l === "improved") return <Chip size="small" color="primary" variant="outlined" label="Mejora" />;
  
  // Naranja/Amarillo para los que están buscando (unemployed)
  if (l === "unemployed") return <Chip size="small" color="warning" label="Buscando" />;
  
  // Gris por defecto (unknown o cualquier otro)
  return <Chip size="small" label={v} />;
};

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
            placeholder="Expediente, nombre, apellidos, DNI/NIE, distrito o curso"
          />
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExport}>
            Exportar CSV
          </Button>
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nº EXPEDIENTE</TableCell>
              <TableCell>NOMBRE</TableCell>
              <TableCell>APELLIDOS</TableCell>
              <TableCell>DNI/NIE</TableCell>
              <TableCell>DISTRITO</TableCell>
              <TableCell>CURSO FORMACIÓN</TableCell>
              <TableCell>SITUACIÓN LABORAL</TableCell>
              <TableCell>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={8} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.expediente}</TableCell>
                <TableCell>{s.nombre}</TableCell>
                <TableCell>{s.apellidos}</TableCell>
                <TableCell>{s.dniNie}</TableCell>
                <TableCell>{s.distrito}</TableCell>
                <TableCell>{s.cursoFormacion}</TableCell>
                <TableCell>{renderSituacion(s.situacionLaboral)}</TableCell>
                <TableCell>
                  <Button component={RouterLink} to={`/students/${s.id}`} size="small">
                    Ver Detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No hay resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
