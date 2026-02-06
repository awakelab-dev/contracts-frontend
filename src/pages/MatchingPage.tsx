import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Student, Vacancy, Company } from "../types";
import { computeMatchingScore, scoreColor } from "../utils/MatchingEngine";

export default function MatchingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [vacancyId, setVacancyId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const backTo = (location.state as any)?.from;
  const handleBack = () => {
    if (typeof backTo === "string" && backTo.startsWith("/")) navigate(backTo);
    else if (location.key !== "default") navigate(-1);
    else navigate("/vacancies");
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const vid = Number(params.get("vacancyId"));
    if (Number.isFinite(vid) && vid > 0) setVacancyId(vid);
  }, [location.search]);

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
        if (v.length) setVacancyId((current) => (current ? current : v[0].id));
      })
      .catch((e) => setError(e?.response?.data?.message || e?.message || "Error al cargar datos de matching"))
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
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

  useEffect(() => {
    // Cuando cambia la vacante, volvemos a la primera página.
    setPage(0);
  }, [vacancyId]);

  const rows = useMemo(() => {
    if (!selectedVacancy) return [] as { student: Student; score: number }[];
    return students
      .map((s) => ({ student: s, score: computeMatchingScore(s, selectedVacancy) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [students, selectedVacancy]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Matching candidatos – vacantes</Typography>
        {typeof backTo === "string" && backTo.startsWith("/") ? (
          <Button size="small" onClick={handleBack}>
            Volver
          </Button>
        ) : null}
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
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Candidato</TableCell>
                  <TableCell>Distrito</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pagedRows.map(({ student, score }) => (
                  <TableRow key={student.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{`${student.first_names} ${student.last_names}`.trim()}</Typography>
                        <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                      </Stack>
                    </TableCell>
                    <TableCell>{student.district ?? "-"}</TableCell>
                    <TableCell width={200}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{score} / 100</Typography>
                        <LinearProgress variant="determinate" value={score} color={scoreColor(score)} />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={RouterLink}
                        to={`/students/${student.id}`}
                        state={{ from: location.pathname + location.search }}
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
                    <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No hay candidatos sugeridos para esta vacante
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <TablePagination
              component="div"
              count={rows.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="Filas por página"
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
