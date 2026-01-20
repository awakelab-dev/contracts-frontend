import { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  LinearProgress,
  Button,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

type Vacancy = {
  id: number;
  title: string;
  company: string;
  sector: string;
};

type MatchRow = {
  studentId: number;
  fullName: string;
  courseCode: string;
  score: number; // 0-100
  status: "eligible" | "borderline" | "low";
};

const VACANCIES: Vacancy[] = [
  { id: 1, title: "Camarero/a terraza fin de semana", company: "R. PARAGUAS", sector: "Hostelería" },
  { id: 2, title: "Runner restaurante alta gama", company: "TATEL", sector: "Hostelería" },
  { id: 3, title: "Dependiente/a tienda urbana", company: "SNIPES ROPA", sector: "Comercio" },
];

const MATCHES_BY_VACANCY: Record<number, MatchRow[]> = {
  1: [
    { studentId: 1, fullName: "ANTHONY JOSUE BRUFAU MODESTO", courseCode: "EMHA 01", score: 92, status: "eligible" },
    { studentId: 4, fullName: "JEROME MICHAEL MASONGSONG", courseCode: "EMHA 01", score: 88, status: "eligible" },
    { studentId: 10, fullName: "SOFIA AGUILAR LUQUE", courseCode: "EMHA 01", score: 81, status: "eligible" },
    { studentId: 2, fullName: "DELIA FERNANDINO LÓPEZ", courseCode: "EMHA 01", score: 65, status: "borderline" },
  ],
  2: [
    { studentId: 4, fullName: "JEROME MICHAEL MASONGSONG", courseCode: "EMHA 01", score: 95, status: "eligible" },
    { studentId: 7, fullName: "PATRICIA IBELIA BECERRA GRANDA", courseCode: "EMHA 01", score: 78, status: "borderline" },
  ],
  3: [
    { studentId: 2, fullName: "DELIA FERNANDINO LÓPEZ", courseCode: "EMHA 01", score: 84, status: "eligible" },
    { studentId: 3, fullName: "ESTEFANY QUIÑOY IBÁÑEZ", courseCode: "EMHA 01", score: 60, status: "borderline" },
  ],
};

function scoreColor(score: number) {
  if (score >= 85) return "success";
  if (score >= 70) return "primary";
  return "warning";
}

function statusChip(status: MatchRow["status"]) {
  switch (status) {
    case "eligible":
      return <Chip label="Alta afinidad" color="success" size="small" />;
    case "borderline":
      return <Chip label="Afinidad media" color="warning" size="small" />;
    default:
      return <Chip label="Baja afinidad" size="small" />;
  }
}

export default function MatchingPage() {
  const [vacancyId, setVacancyId] = useState<number>(1);

  const vacancy = useMemo(
    () => VACANCIES.find((v) => v.id === vacancyId) ?? VACANCIES[0],
    [vacancyId]
  );
  const rows = useMemo(
    () => MATCHES_BY_VACANCY[vacancy?.id ?? 1] ?? [],
    [vacancy?.id]
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Matching candidatos – vacantes</Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <TextField
            select
            label="Vacante"
            value={vacancyId}
            onChange={(e) => setVacancyId(Number(e.target.value))}
            size="small"
            sx={{ minWidth: 260 }}
          >
            {VACANCIES.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.title} — {v.company}
              </MenuItem>
            ))}
          </TextField>
          <Stack spacing={0.5}>
            <Typography variant="body2">
              <strong>Empresa:</strong> {vacancy.company}
            </Typography>
            <Typography variant="body2">
              <strong>Sector:</strong> {vacancy.sector}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Candidato</TableCell>
              <TableCell>Curso</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Detalle score</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.studentId} hover>
                <TableCell>{r.fullName}</TableCell>
                <TableCell>{r.courseCode}</TableCell>
                <TableCell width={200}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">{r.score} / 100</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={r.score}
                      color={scoreColor(r.score) as any}
                    />
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    Coincidencia en curso/sector + disponibilidad
                  </Typography>
                </TableCell>
                <TableCell>{statusChip(r.status)}</TableCell>
                <TableCell align="right">
                  <Button
                    component={RouterLink}
                    to={`/students/${r.studentId}`}
                    size="small"
                    variant="outlined"
                  >
                    Ver alumno
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay candidatos sugeridos para esta vacante
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}