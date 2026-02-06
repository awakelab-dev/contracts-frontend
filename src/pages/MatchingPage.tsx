import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { scoreColor } from "../utils/MatchingEngine";

type MatchingStatus = {
  openai_configured: boolean;
  model: string;
  prompt_version: number;
  vacancies: number;
  course_topics: number;
  match_pairs: number;
  missing_course_topics: number;
  missing_pairs_existing_topics: number;
  estimated_missing_pairs_after_topics_upsert: number;
  needs_update: boolean;
};

type MatchingStudentRow = Student & {
  score: number;
  matched_topics_count: number;
};

export default function MatchingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancyId, setVacancyId] = useState<number | "">("");

  const [status, setStatus] = useState<MatchingStatus | null>(null);
  const [matchRows, setMatchRows] = useState<MatchingStudentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [info, setInfo] = useState<string | null>(null);
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

  const refreshStatus = async () => {
    const { data } = await api.get<MatchingStatus>("/matching/status");
    setStatus(data);
    return data;
  };

  const refreshMatches = async (currentVacancyId: number) => {
    setLoadingMatches(true);
    try {
      const { data } = await api.get<MatchingStudentRow[]>("/matching/students", {
        params: { vacancyId: currentVacancyId, limit: 500 },
      });
      setMatchRows(Array.isArray(data) ? data : []);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<Vacancy[]>("/vacancies"),
      api.get<Company[]>("/companies"),
      refreshStatus().catch(() => null),
    ])
      .then(([vRes, cRes]) => {
        if (cancel) return;
        const v = Array.isArray(vRes.data) ? vRes.data : [];
        setVacancies(v);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const vid = Number(vacancyId);
    if (!Number.isFinite(vid) || vid <= 0) {
      setMatchRows([]);
      return;
    }

    refreshMatches(vid).catch((e) => {
      setError(e?.response?.data?.error || e?.message || "Error al consultar matching");
      setMatchRows([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancyId]);

  useEffect(() => {
    // Cuando cambia la vacante, volvemos a la primera página.
    setPage(0);
  }, [vacancyId]);

  const rows = matchRows;

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const statusChip = status ? (
    <Chip
      size="small"
      label={status.needs_update ? "Requiere actualización" : "Actualizado"}
      color={status.needs_update ? "warning" : "success"}
      variant={status.needs_update ? "filled" : "outlined"}
    />
  ) : null;

  const runUpdate = async () => {
    setInfo(null);
    setError(null);

    const st = await refreshStatus().catch(() => null);
    if (st && !st.needs_update) {
      setInfo("Todo está actualizado");
      return;
    }

    setUpdating(true);
    try {
      let totalProcessed = 0;
      for (let i = 0; i < 200; i++) {
        const { data } = await api.post<any>("/matching/update", { limit: 15 });
        totalProcessed += Number(data?.processed_pairs || 0);
        setInfo(`Actualizando matching… (${totalProcessed} relaciones procesadas)`);

        const needsUpdate = !!data?.needs_update;
        if (!needsUpdate) break;
      }

      const st2 = await refreshStatus().catch(() => null);
      setInfo(st2?.needs_update ? "Actualización parcial (quedan pendientes)" : "Matching actualizado");

      const vid = Number(vacancyId);
      if (Number.isFinite(vid) && vid > 0) {
        await refreshMatches(vid);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al actualizar matching");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">Matching candidatos – vacantes</Typography>
          {statusChip}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" variant="contained" onClick={runUpdate} disabled={loading || updating}>
            {updating ? "Actualizando…" : "Actualizar Matchs"}
          </Button>
          {typeof backTo === "string" && backTo.startsWith("/") ? (
            <Button size="small" onClick={handleBack}>
              Volver
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {info && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
          {info}
        </Alert>
      )}

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
              <Typography variant="body2">
                <strong>Empresa:</strong> {companyName.get(selectedVacancy.company_id) || `#${selectedVacancy.company_id}`}
              </Typography>
              <Typography variant="body2">
                <strong>Sector:</strong> {selectedVacancy.sector ?? "-"}
              </Typography>
              {status?.needs_update ? (
                <Typography variant="caption" color="text.secondary">
                  Faltan relaciones por calcular: {status.estimated_missing_pairs_after_topics_upsert}
                </Typography>
              ) : null}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        {loading && <Typography align="center">Cargando…</Typography>}
        {error && <Typography color="error" align="center">Error: {error}</Typography>}
        {!loading && !error && (
          <>
            {loadingMatches ? <LinearProgress sx={{ mb: 1 }} /> : null}

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
                {pagedRows.map((student) => (
                  <TableRow key={student.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{`${student.first_names} ${student.last_names}`.trim()}</Typography>
                        <Chip size="small" label={`${student.score}%`} color={scoreColor(student.score)} />
                      </Stack>
                    </TableCell>
                    <TableCell>{student.district ?? "-"}</TableCell>
                    <TableCell width={200}>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{student.score} / 100</Typography>
                        <LinearProgress variant="determinate" value={student.score} color={scoreColor(student.score)} />
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
