import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";

type Practice = {
  cif: string;
  razonSocial: string;
  firmanteNombre: string;
  firmanteNif: string;
  centroTrabajo: string;
  puesto: string;
  fechaInicio: string;
  fechaFin?: string;
  horario: string[]; // puede variar por días
  horasSemanales: number;
  observaciones?: string;
};

const PRACTICES_BY_STUDENT: Record<string, Practice[]> = {
  "1": [
    {
      cif: "B12345678",
      razonSocial: "CONSTRUCCIONES GAHERJO, S.L.",
      firmanteNombre: "Laura Pérez",
      firmanteNif: "12345678A",
      centroTrabajo: "C/ Mayor 15, Madrid",
      puesto: "Operario obra (prácticas)",
      fechaInicio: "2025-05-29",
      fechaFin: "2025-06-07",
      horario: ["09:00-14:00", "09:00-14:00", "09:00-13:00", "10:00-14:00", "09:00-12:00"],
      horasSemanales: 22,
      observaciones: "Rotación por secciones.",
    },
  ],
  "4": [
    {
      cif: "A87654321",
      razonSocial: "GRUPO PARAGUAS, S.A.",
      firmanteNombre: "Marcos Díaz",
      firmanteNif: "87654321Z",
      centroTrabajo: "C/ Serrano 24, Madrid",
      puesto: "Runner (prácticas)",
      fechaInicio: "2025-05-29",
      fechaFin: "2025-06-07",
      horario: ["10:00-14:00"],
      horasSemanales: 20,
      observaciones: "Turno mañana.",
    },
  ],
};

export default function StudentPracticesPage() {
  const { id } = useParams();
  const rows = PRACTICES_BY_STUDENT[String(id ?? "")] ?? [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Prácticas no laborables</Typography>
        <Button component={RouterLink} to={`/students/${id}`}>Volver</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Histórico de prácticas</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>CIF empresa</TableCell>
              <TableCell>Razón social</TableCell>
              <TableCell>Nombre firmante</TableCell>
              <TableCell>NIF firmante</TableCell>
              <TableCell>Centro de trabajo</TableCell>
              <TableCell>Puesto</TableCell>
              <TableCell>Fecha inicio</TableCell>
              <TableCell>Fecha fin</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Horas semanales</TableCell>
              <TableCell>Observaciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? (
              rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.cif}</TableCell>
                  <TableCell>{r.razonSocial}</TableCell>
                  <TableCell>{r.firmanteNombre}</TableCell>
                  <TableCell>{r.firmanteNif}</TableCell>
                  <TableCell>{r.centroTrabajo}</TableCell>
                  <TableCell>{r.puesto}</TableCell>
                  <TableCell>{r.fechaInicio}</TableCell>
                  <TableCell>{r.fechaFin || ""}</TableCell>
                  <TableCell>
                    {r.horario.map((h, idx) => (
                      <div key={idx}>{h}</div>
                    ))}
                  </TableCell>
                  <TableCell>{r.horasSemanales}</TableCell>
                  <TableCell>{r.observaciones || ""}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography color="text.secondary">Sin prácticas registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
