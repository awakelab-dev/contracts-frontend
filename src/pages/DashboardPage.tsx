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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import DescriptionIcon from "@mui/icons-material/Description";
import EmailIcon from "@mui/icons-material/Email";

const SUMMARY = {
  studentsTotal: 120,
  studentsEmployedEver: 46,
  studentsCurrentlyEmployed: 28,
  cvMissing: 12,
  vacanciesOpen: 7,
};

export default function DashboardPage() {
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
          <Typography variant="h5">{SUMMARY.studentsTotal}</Typography>
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
          <Typography variant="h5">{SUMMARY.studentsEmployedEver}</Typography>
          <Chip
            size="small"
            color="success"
            label={`${Math.round(
              (SUMMARY.studentsEmployedEver / SUMMARY.studentsTotal) * 100
            )}%`}
            sx={{ mt: 1 }}
          />
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 220 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <TrendingUpIcon color="primary" />
            <Typography variant="body2" color="text.secondary">
              Actualmente trabajando
            </Typography>
          </Stack>
          <Typography variant="h5">{SUMMARY.studentsCurrentlyEmployed}</Typography>
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
          <Typography variant="h5">{SUMMARY.cvMissing}</Typography>
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
            <Button
              component={RouterLink}
              to="/students"
              variant="contained"
              color="primary"
            >
              Ver lista de alumnos
            </Button>
            <Button
              component={RouterLink}
              to="/vacancies"
              variant="outlined"
              color="primary"
            >
              Gestionar vacantes
            </Button>
            <Button
              component={RouterLink}
              to="/matching"
              variant="outlined"
              color="secondary"
            >
              Matching candidatos
            </Button>
            <Button
              component={RouterLink}
              to="/import"
              variant="text"
              color="inherit"
            >
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
                secondary={`Hay ${SUMMARY.cvMissing} alumnos sin CV actualizado.`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Vacantes abiertas"
                secondary={`Actualmente hay ${SUMMARY.vacanciesOpen} vacantes abiertas.`}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Seguimiento de estado laboral"
                secondary="Revisa los alumnos sin actualización en los últimos 3 meses."
              />
            </ListItem>
          </List>
          <Button
            component={RouterLink}
            to="/emails"
            startIcon={<EmailIcon />}
            size="small"
          >
            Revisar plantillas de email
          </Button>
        </Paper>
      </Stack>
    </Box>
  );
}
