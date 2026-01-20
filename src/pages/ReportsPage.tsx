import { Box, Button, Paper, Stack, Typography, ToggleButton, ToggleButtonGroup, Grid, Chip } from "@mui/material";
import { useState } from "react";

type ReportData = {
  alumnosAccedenPracticas: number;
  alumnosEntrevistas: number;
  alumnosIncorporados: number;
  alumnosMas6Meses: number;
  valoracionEmpresasMedia: number;
  insercionLaboral: number;
  porcentajeEmpleoAntes3Meses: number;
  tiempoPromedioBusqueda: number;
  alumnosFinalizanPNL: number;
};

const REPORT_DATA_MENSUAL: ReportData = {
  alumnosAccedenPracticas: 8,
  alumnosEntrevistas: 12,
  alumnosIncorporados: 6,
  alumnosMas6Meses: 3,
  valoracionEmpresasMedia: 7.8,
  insercionLaboral: 65,
  porcentajeEmpleoAntes3Meses: 58,
  tiempoPromedioBusqueda: 45,
  alumnosFinalizanPNL: 10,
};

const REPORT_DATA_TRIMESTRAL: ReportData = {
  alumnosAccedenPracticas: 24,
  alumnosEntrevistas: 35,
  alumnosIncorporados: 18,
  alumnosMas6Meses: 9,
  valoracionEmpresasMedia: 7.9,
  insercionLaboral: 68,
  porcentajeEmpleoAntes3Meses: 60,
  tiempoPromedioBusqueda: 42,
  alumnosFinalizanPNL: 28,
};

export default function ReportsPage() {
  const [tipoInforme, setTipoInforme] = useState<"MENSUAL" | "TRIMESTRAL">("MENSUAL");

  const data = tipoInforme === "MENSUAL" ? REPORT_DATA_MENSUAL : REPORT_DATA_TRIMESTRAL;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Informes</Typography>
        <Button variant="contained">Informe de Liquidación</Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="subtitle1">Tipo de Informe:</Typography>
          <ToggleButtonGroup
            value={tipoInforme}
            exclusive
            onChange={(_, value) => value && setTipoInforme(value)}
            size="small"
          >
            <ToggleButton value="MENSUAL">MENSUAL</ToggleButton>
            <ToggleButton value="TRIMESTRAL">TRIMESTRAL</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que acceden a prácticas no laborales</Typography>
            <Typography variant="h4">{data.alumnosAccedenPracticas}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que asisten a entrevistas de trabajo</Typography>
            <Typography variant="h4">{data.alumnosEntrevistas}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que se incorporan a un puesto de trabajo</Typography>
            <Typography variant="h4">{data.alumnosIncorporados}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as incorporados a empresas superan los 6 meses de permanencia en este mes</Typography>
            <Typography variant="h4">{data.alumnosMas6Meses}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Valoración de empresas del sector sobre la calidad formativa/profesional de los alumnos recibidos. Media ponderada en escala del 1 al 10</Typography>
            <Typography variant="h4">{data.valoracionEmpresasMedia.toFixed(1)}</Typography>
            <Chip label={data.valoracionEmpresasMedia >= 7.5 ? "Excelente" : "Buena"} color="success" size="small" sx={{ mt: 1 }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Indicadores de impacto en el alumnado: Inserción laboral</Typography>
            <Typography variant="h4">{data.insercionLaboral}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Porcentaje de alumnos que consiguen empleo en el sector hostelero antes de tres meses tras la finalización del itinerario</Typography>
            <Typography variant="h4">{data.porcentajeEmpleoAntes3Meses}%</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Tiempo promedio de búsqueda de empleo (días)</Typography>
            <Typography variant="h4">{data.tiempoPromedioBusqueda}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Alumnos que finalizan prácticas (PNL)</Typography>
            <Typography variant="h4">{data.alumnosFinalizanPNL}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
