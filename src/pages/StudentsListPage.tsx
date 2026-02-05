import React from "react";
import {
  Box,
  Button,
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
  nombres: string;
  apellidos: string;
  dniNie: string;
  nss: string;
  fechaNacimiento: string;
  distrito: string;
  telefono: string;
  email: string;
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
      return {
        id: String(s.id),
        expediente: String(s.id),
        nombres: s.first_names,
        apellidos: s.last_names,
        dniNie: s.dni_nie,
        nss: s.social_security_number ?? "",
        fechaNacimiento: s.birth_date ?? "",
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
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nº EXPEDIENTE</TableCell>
              <TableCell>NOMBRES</TableCell>
              <TableCell>APELLIDOS</TableCell>
              <TableCell>DNI / NIE</TableCell>
              <TableCell>Nº SEG. SOCIAL</TableCell>
              <TableCell>FECHA NACIMIENTO</TableCell>
              <TableCell>DISTRITO</TableCell>
              <TableCell>TELÉFONO</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
        <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={10} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell>{s.expediente}</TableCell>
                <TableCell>{s.nombres}</TableCell>
                <TableCell>{s.apellidos}</TableCell>
                <TableCell>{s.dniNie}</TableCell>
                <TableCell>{s.nss || "-"}</TableCell>
                <TableCell>{s.fechaNacimiento || "-"}</TableCell>
                <TableCell>{s.distrito || "-"}</TableCell>
                <TableCell>{s.telefono || "-"}</TableCell>
                <TableCell>{s.email || "-"}</TableCell>
                <TableCell>
                  <Button component={RouterLink} to={`/students/${s.id}`} size="small">
                    Ver Detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
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
