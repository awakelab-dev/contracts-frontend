import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import EmailIcon from "@mui/icons-material/Email";
import api from "../lib/api";
import { useEffect, useState, useMemo } from "react";

type StatsSummary = {
  total_students: number;
  employed_or_improved: number;
  currently_employed: number;
  missing_cvs: number;
  open_vacancies?: number;
  employed_rate?: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api.get<StatsSummary>("/stats/summary")
      .then(({ data }) => {
        if (cancel) return;
        setStats(data);
      })
      .catch((e) => {
        if (cancel) return;
        setError(e?.response?.data?.message || e?.message || "Error al cargar estadísticas");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });
    return () => { cancel = true; };
  }, []);

  const employedPct = useMemo(() => {
    if (!stats || !stats.total_students) return 0;
    return Math.round((stats.employed_or_improved / stats.total_students) * 100);
  }, [stats]);

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Resumen general
      </Typography>

      {/* KPIs principales */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", md: "stretch" }}
        mb={3}
      >
        <Paper sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <SchoolIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Alumnos activos
            </Typography>
          </Stack>
          {loading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h5">{stats?.total_students ?? 0}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Total en los últimos 12 meses
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <WorkIcon color="success" />
            <Typography variant="body2" color="text.secondary">
              Con empleo en algún momento
            </Typography>
          </Stack>
          {loading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h5">{stats?.employed_or_improved ?? 0}</Typography>
          )}
          {!loading && (
            <Chip size="small" color="success" label={`${employedPct}%`} sx={{ mt: 1 }} />
          )}
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <TrendingUpIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Actualmente trabajando
            </Typography>
          </Stack>
          {loading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h5">{stats?.currently_employed ?? 0}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Incluye mejoras de empleo
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <DescriptionIcon color="warning" />
            <Typography variant="body2" color="text.secondary">
              CVs faltantes
            </Typography>
          </Stack>
          {loading ? (
            <Skeleton variant="text" width={80} height={32} />
          ) : (
            <Typography variant="h5">{stats?.missing_cvs ?? 0}</Typography>
          )}
          <Chip size="small" color="warning" label="Acción recomendada" sx={{ mt: 1 }} />
        </Paper>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="flex-start"
      >
        {/* Accesos rápidos */}
        <Paper sx={{ p: 2, flex: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Accesos rápidos
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Button component={RouterLink} to="/students" variant="contained" color="primary">
              Ver lista de alumnos
            </Button>
            <Button component={RouterLink} to="/vacancies" variant="outlined" color="primary">
              Gestionar vacantes
            </Button>
            <Button component={RouterLink} to="/matching" variant="outlined" color="secondary">
              Matching candidatos
            </Button>
            <Button component={RouterLink} to="/import" variant="text" color="inherit">
              Importar datos (CSV)
            </Button>
          </Stack>
        </Paper>

        {/* Recordatorios */}
        <Paper sx={{ p: 2, flex: 1, minWidth: 260 }}>
          <Typography variant="subtitle1" gutterBottom>
            Recordatorios
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            <ListItem>
              <ListItemText
                primary="Alumnos con CV pendiente"
                secondary={`Hay ${stats?.missing_cvs ?? 0} alumnos sin CV actualizado.`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Vacantes abiertas"
                secondary={`Actualmente hay ${stats?.open_vacancies ?? 0} vacantes abiertas.`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Seguimiento de estado laboral"
                secondary="Revisa los alumnos sin actualización en los últimos 3 meses."
              />
            </ListItem>
          </List>
          <Button component={RouterLink} to="/emails" startIcon={<EmailIcon />} size="small">
            Revisar plantillas de email
          </Button>
        </Paper>
      </Stack>
    </Box>
  );
}
