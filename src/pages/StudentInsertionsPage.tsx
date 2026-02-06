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
import { formatDateDMY } from "../utils/date";

type Hiring = {
  cifEmpresa: string;
  nombreEmpresa: string;
  sector: string;
  fechaInicio: string;
  fechaFin?: string;
  porcentajeJornada: string; // p.ej. "100%", "50%"
  grupoCotizacion: string;
  tipoContrato: string;
  horasSemanales: number;
  diasCotizados: number;
};

const HIRES_BY_STUDENT: Record<string, Hiring[]> = {
  "1": [
    {
      cifEmpresa: "B22334455",
      nombreEmpresa: "SERVIMAD S.A.",
      sector: "Hostelería",
      fechaInicio: "2025-09-10",
      fechaFin: "2025-10-05",
      porcentajeJornada: "50%",
      grupoCotizacion: "Grupo 6",
      tipoContrato: "Temporal",
      horasSemanales: 20,
      diasCotizados: 25,
    },
  ],
  "4": [
    {
      cifEmpresa: "A99887766",
      nombreEmpresa: "GRUPO PARAGUAS, S.A.",
      sector: "Hostelería",
      fechaInicio: "2025-06-16",
      porcentajeJornada: "100%",
      grupoCotizacion: "Grupo 5",
      tipoContrato: "Indefinido",
      horasSemanales: 40,
      diasCotizados: 180,
    },
    {
      cifEmpresa: "B33445566",
      nombreEmpresa: "Grupo La Terraza",
      sector: "Hostelería",
      fechaInicio: "2025-11-01",
      fechaFin: "2025-11-30",
      porcentajeJornada: "75%",
      grupoCotizacion: "Grupo 6",
      tipoContrato: "Temporal",
      horasSemanales: 30,
      diasCotizados: 30,
    },
  ],
};

export default function StudentInsertionsPage() {
  const { id } = useParams();
  const rows = HIRES_BY_STUDENT[String(id ?? "")] ?? [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Histórico de contrataciones</Typography>
        <Button component={RouterLink} to={`/students/${id}`}>Volver</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>CIF empresa que contrata</TableCell>
              <TableCell>Nombre de la empresa que contrata</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Fecha inicio contrato</TableCell>
              <TableCell>Fecha fin de contrato</TableCell>
              <TableCell>Porcentaje de jornada</TableCell>
              <TableCell>Grupo de cotización</TableCell>
              <TableCell>Tipo de contrato</TableCell>
              <TableCell>Horas semanales contratadas</TableCell>
              <TableCell>Días cotizados</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length ? (
              rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.cifEmpresa}</TableCell>
                  <TableCell>{r.nombreEmpresa}</TableCell>
                  <TableCell>{r.sector}</TableCell>
                  <TableCell>{formatDateDMY(r.fechaInicio)}</TableCell>
                  <TableCell>{formatDateDMY(r.fechaFin, "")}</TableCell>
                  <TableCell>{r.porcentajeJornada}</TableCell>
                  <TableCell>{r.grupoCotizacion}</TableCell>
                  <TableCell>{r.tipoContrato}</TableCell>
                  <TableCell>{r.horasSemanales}</TableCell>
                  <TableCell>{r.diasCotizados}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography color="text.secondary">Sin contrataciones registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
