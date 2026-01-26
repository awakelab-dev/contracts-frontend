import { Box, Button, Paper, Stack, Typography, ToggleButton, ToggleButtonGroup, Grid, Chip, Skeleton } from "@mui/material";
import { useEffect, useState } from "react";
import api from "../lib/api";

type ReportData = {
  alumnosAccedenPracticas: number;
  alumnosEntrevistas: number;
  alumnosIncorporados: number;
  alumnosMas6Meses: number;
  valoracionEmpresasMedia: number;
  insercionLaboral: number; // %
  porcentajeEmpleoAntes3Meses: number; // %
  tiempoPromedioBusqueda: number; // días (placeholder 0)
  alumnosFinalizanPNL: number;
};

export default function ReportsPage() {
  const [tipoInforme, setTipoInforme] = useState<"MENSUAL" | "TRIMESTRAL">("MENSUAL");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api.get<ReportData>("/stats/reports")
      .then(({ data }) => { if (!cancel) setData(data); })
      .catch((e) => { if (!cancel) setError(e?.response?.data?.message || e?.message || "Error al cargar informes"); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

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
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que acceden a prácticas no laborables</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.alumnosAccedenPracticas ?? 0}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que asisten a entrevistas de trabajo</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.alumnosEntrevistas ?? 0}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as que se incorporan a un puesto de trabajo</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.alumnosIncorporados ?? 0}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Número de alumnos/as incorporados a empresas superan los 6 meses de permanencia en este mes</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.alumnosMas6Meses ?? 0}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Valoración de empresas del sector sobre la calidad formativa/profesional de los alumnos recibidos. Media ponderada en escala del 1 al 10</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : (
              <>
                <Typography variant="h4">{(data?.valoracionEmpresasMedia ?? 0).toFixed(1)}</Typography>
                <Chip label={(data?.valoracionEmpresasMedia ?? 0) >= 7.5 ? "Excelente" : "Buena"} color="success" size="small" sx={{ mt: 1 }} />
              </>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Indicadores de impacto en el alumnado: Inserción laboral</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.insercionLaboral ?? 0}%</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Porcentaje de alumnos que consiguen empleo en el sector hostelero antes de tres meses tras la finalización del itinerario</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.porcentajeEmpleoAntes3Meses ?? 0}%</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Tiempo promedio de búsqueda de empleo (días)</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.tiempoPromedioBusqueda ?? 0}</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Alumnos que finalizan prácticas (PNL)</Typography>
            {loading ? <Skeleton variant="text" width={60} height={42} /> : <Typography variant="h4">{data?.alumnosFinalizanPNL ?? 0}</Typography>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
