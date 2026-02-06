import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { formatDateDMY } from "../utils/date";

// Datos mock locales (sin BD)
const STUDENTS = {
  "1": {
    expediente: "EXP-2025-001",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Luis Gómez",
    nombre: "ANTHONY JOSUE",
    apellidos: "BRUFAU MODESTO",
    dniNie: "Y3451629X",
    nss: "12 34567890 01",
    fechaNacimiento: "1996-03-12",
    edad: 29,
    distrito: "Centro",
    telefono: "600123456",
    email: "anthony.brufau@example.com",
  },
  "2": {
    expediente: "EXP-2025-002",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Ana Ruiz",
    nombre: "DELIA",
    apellidos: "FERNANDINO LÓPEZ",
    dniNie: "06655123G",
    nss: "11 22334455 02",
    fechaNacimiento: "1993-11-02",
    edad: 32,
    distrito: "Tetuán",
    telefono: "600234567",
    email: "delia.fernandino@example.com",
  },
} as const;

export default function StudentEditPage() {
  const { id } = useParams();
  const key = id === "1" || id === "2" ? id : "1";
  const data = STUDENTS[key]; // valores por defecto

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Editar alumno</Typography>
        <Button component={RouterLink} to="/students">Volver</Button>
      </Stack>

      {/* Sección 1 - Datos personales (simple, sin guardado) */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>DATOS PERSONALES</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="Nº EXPEDIENTE" size="small" defaultValue={data.expediente} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="CURSO FORMACIÓN" size="small" defaultValue={data.cursoFormacion} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="TECNICO LABORAL" size="small" defaultValue={data.tecnicoLaboral} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="NOMBRE" size="small" defaultValue={data.nombre} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="APELLIDOS" size="small" defaultValue={data.apellidos} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="DNI / NIE" size="small" defaultValue={data.dniNie} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="Nº SEGURIDAD SOCIAL" size="small" defaultValue={data.nss} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="FECHA NACIMIENTO" size="small" defaultValue={formatDateDMY(data.fechaNacimiento, "")} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="EDAD" size="small" defaultValue={data.edad} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="DISTRITO" size="small" defaultValue={data.distrito} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="TLF CONTACTO" size="small" defaultValue={data.telefono} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField fullWidth label="E-MAIL" size="small" defaultValue={data.email} />
          </Grid>
        </Grid>
      </Paper>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" disabled>Guardar (mock)</Button>
        <Button component={RouterLink} to="/students">Cancelar</Button>
      </Stack>
    </Box>
  );
}
