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

const STUDENTS: StudentLite[] = [
  {
    id: "1",
    expediente: "EXP-2025-001",
    nombre: "ANTHONY JOSUE",
    apellidos: "BRUFAU MODESTO",
    dniNie: "Y3451629X",
    distrito: "Centro",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    situacionLaboral: "Mejora empleo",
  },
  {
    id: "2",
    expediente: "EXP-2025-002",
    nombre: "DELIA",
    apellidos: "FERNANDINO LÓPEZ",
    dniNie: "06655123G",
    distrito: "Tetuán",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    situacionLaboral: "Mejora empleo",
  },
  {
    id: "3",
    expediente: "EXP-2025-003",
    nombre: "ESTEFANY",
    apellidos: "QUIÑOY IBÁÑEZ",
    dniNie: "55945510B",
    distrito: "Carabanchel",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    situacionLaboral: "Mejora empleo",
  },
  {
    id: "4",
    expediente: "EXP-2025-004",
    nombre: "JEROME MICHAEL",
    apellidos: "MASONGSONG",
    dniNie: "Y3245604L",
    distrito: "Usera",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    situacionLaboral: "Mejora empleo",
  },
  {
    id: "5",
    expediente: "EXP-2025-005",
    nombre: "MARÍA CARLOTA",
    apellidos: "GARCÍA PÉREZ",
    dniNie: "83214566K",
    distrito: "Chamartín",
    cursoFormacion: "COCINA BÁSICA",
    situacionLaboral: "Sin empleo",
  },
  {
    id: "6",
    expediente: "EXP-2025-006",
    nombre: "JUAN CARLOS",
    apellidos: "RIVERA MARTÍN",
    dniNie: "50991234Z",
    distrito: "Latina",
    cursoFormacion: "COCINA BÁSICA",
    situacionLaboral: "Mejora empleo",
  },
];

export default function StudentsListPage() {
  const [q, setQ] = React.useState("");
  const rows = React.useMemo(() => {
    const hay = (v?: string) => (v || "").toLowerCase().includes(q.toLowerCase());
    return STUDENTS.filter(
      (s) =>
        hay(s.expediente) ||
        hay(s.nombre) ||
        hay(s.apellidos) ||
        hay(s.dniNie) ||
        hay(s.distrito) ||
        hay(s.cursoFormacion) ||
        hay(s.situacionLaboral)
    );
  }, [q]);

  const renderSituacion = (v: string) => {
    const l = v.toLowerCase();
    if (l.startsWith("trabaj")) return <Chip size="small" color="success" label={v} />;
    if (l.startsWith("mejora")) return <Chip size="small" color="primary" variant="outlined" label={v} />;
    if (l.startsWith("sin")) return <Chip size="small" color="warning" label={v} />;
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
            {rows.map((s) => (
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
            {rows.length === 0 && (
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
