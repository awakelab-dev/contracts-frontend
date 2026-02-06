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

function fmtBirthDateDdMmYyyy(v?: string | null): string {
  const s = (v || "").toString();
  if (!s) return "";
  const iso = s.length >= 10 ? s.slice(0, 10) : s;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function StudentsListPage() {
  const navigate = useNavigate();

  const [q, setQ] = React.useState("");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

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
        fechaNacimiento: fmtBirthDateDdMmYyyy(s.birth_date),
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
    </Box>
  );
}
