import { useEffect, useMemo, useState } from "react";
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
import api from "../lib/api";
import type { Student, Vacancy, Company } from "../types";
import { computeMatchingScore, scoreColor } from "../utils/MatchingEngine";

export default function MatchingPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vacancyId, setVacancyId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Vacancy[]>("/vacancies"),
      api.get<Student[]>("/students"),
      api.get<Company[]>("/companies"),
    ])
      .then(([vRes, sRes, cRes]) => {
        if (cancel) return;
        const v = Array.isArray(vRes.data) ? vRes.data : [];
        setVacancies(v);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
        if (!vacancyId && v.length) setVacancyId(v[0].id);
      })
      .catch((e) => setError(e?.response?.data?.message || e?.message || "Error al cargar datos de matching"))
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    companies.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const selectedVacancy = useMemo(
    () => vacancies.find((v) => v.id === Number(vacancyId)) || null,
    [vacancies, vacancyId]
  );

  const rows = useMemo(() => {
    if (!selectedVacancy) return [] as { student: Student; score: number }[];
    return students
      .map((s) => ({ student: s, score: computeMatchingScore(s, selectedVacancy) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [students, selectedVacancy]);

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
            disabled={loading || !!error}
          >
            {vacancies.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.title} — {companyName.get(v.company_id) || `Empresa #${v.company_id}`}
              </MenuItem>
            ))}
          </TextField>
          {selectedVacancy && (
            <Stack spacing={0.5}>
              <Typography variant="body2"><strong>Empresa:</strong> {companyName.get(selectedVacancy.company_id) || `#${selectedVacancy.company_id}`}</Typography>
              <Typography variant="body2"><strong>Sector:</strong> {selectedVacancy.sector ?? '-'}</Typography>
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {loading && <Typography align="center">Cargando…</Typography>}
        {error && <Typography color="error" align="center">Error: {error}</Typography>}
        {!loading && !error && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Candidato</TableCell>
                <TableCell>Curso</TableCell>
                <TableCell>Score</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(({ student, score }) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>{student.full_name}</Typography>
                      <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                    </Stack>
                  </TableCell>
                  <TableCell>{student.course_code}</TableCell>
                  <TableCell width={200}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">{score} / 100</Typography>
                      <LinearProgress variant="determinate" value={score} color={scoreColor(score)} />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button component={RouterLink} to={`/students/${student.id}`} size="small" variant="outlined">Ver alumno</Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay candidatos sugeridos para esta vacante
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
