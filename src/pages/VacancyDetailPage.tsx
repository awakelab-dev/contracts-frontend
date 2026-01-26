import { useEffect, useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box, Paper, Stack, Typography, Chip, Divider, List, ListItem, ListItemText, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from "@mui/material";
import api from "../lib/api";
import type { Vacancy, Company, Student, Interview } from "../types";
import { computeMatchingScore, scoreColor } from "../utils/MatchingEngine";

function statusChip(s: Vacancy["status"]) {
  return s === "open" ? <Chip label="Abierta" color="success" size="small" /> : <Chip label="Cerrada" size="small" />;
}

export default function VacancyDetailPage() {
  const { id } = useParams();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [place, setPlace] = useState("");
  const [interviewAt, setInterviewAt] = useState(""); // datetime-local
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    api.get<Vacancy>(`/vacancies/${id}`)
      .then(({ data }) => {
        if (cancel) return;
        setVacancy(data);
        return Promise.all([
          api.get<Company>(`/companies/${data.company_id}`),
          api.get<Student[]>(`/students`),
        ]);
      })
      .then((res) => {
        if (cancel) return;
        if (res) {
          const [cRes, sRes] = res;
          setCompany(cRes.data);
          setStudents(Array.isArray(sRes.data) ? sRes.data : []);
        }
      })
      .catch((err) => {
        if (cancel) return;
        const status = err?.response?.status;
        if (status === 404) setNotFound(true);
        else setError(err?.response?.data?.message || err?.message || "Error al cargar la vacante");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [id]);

  const requirementLines = useMemo(() => {
    const txt = vacancy?.requirements || "";
    return txt
      .split(/\r?\n|,|;|•|-\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [vacancy?.requirements]);

  const recommended = useMemo(() => {
    if (!vacancy) return [] as { student: Student; score: number }[];
    return students
      .map((s) => ({ student: s, score: computeMatchingScore(s, vacancy) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [students, vacancy]);

  function resetInviteForm() {
    setPlace("");
    setInterviewAt("");
    setNotes("");
    setSubmitError(null);
    setSubmitOk(null);
  }

  async function submitInvitation() {
    if (!inviteStudent || !vacancy) return;
    setSubmitError(null);
    setSubmitOk(null);
    try {
      // Convertir datetime-local → YYYY-MM-DD (schema usa DATE)
      const dateOnly = interviewAt ? interviewAt.slice(0, 10) : "";
      const payload = {
        student_id: inviteStudent.id,
        place: place || null,
        interview_date: dateOnly,
        notes: notes || null,
      } satisfies Omit<Interview, "id">;
      await api.post("/interviews", payload);
      setSubmitOk("Entrevista creada correctamente");
      setTimeout(() => {
        setInviteOpen(false);
        resetInviteForm();
      }, 800);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Error al crear la entrevista";
      setSubmitError(msg);
    }
  }

  if (loading) return <Typography>Cargando…</Typography>;
  if (notFound)
    return (
      <Box>
        <Typography variant="h6">Vacante no encontrada (404)</Typography>
        <Button component={RouterLink} to="/vacancies" sx={{ mt: 1 }}>Volver a vacantes</Button>
      </Box>
    );
  if (error)
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
        <Button component={RouterLink} to="/vacancies" sx={{ mt: 1 }}>Volver a vacantes</Button>
      </Box>
    );
  if (!vacancy) return null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">{vacancy.title}</Typography>
          {statusChip(vacancy.status)}
        </Stack>
        <Button component={RouterLink} to="/vacancies">Volver</Button>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, flex: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Información</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Typography><strong>Empresa:</strong> {company?.name || `Empresa #${vacancy.company_id}`}</Typography>
            <Typography><strong>Sector:</strong> {vacancy.sector ?? "-"}</Typography>
            <Typography><strong>Fecha límite:</strong> {vacancy.deadline ?? "-"}</Typography>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle1" gutterBottom>Requisitos</Typography>
          <Divider sx={{ mb: 2 }} />
          {requirementLines.length ? (
            <List dense>
              {requirementLines.map((r, idx) => (
                <ListItem key={idx} disableGutters>
                  <ListItemText primary={r} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">No especificados</Typography>
          )}
        </Paper>
      </Stack>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Candidatos recomendados</Typography>
        {recommended.length ? (
          <List dense>
            {recommended.map(({ student, score }) => (
              <ListItem key={student.id} disableGutters secondaryAction={
                <Button size="small" variant="contained" onClick={() => { setInviteStudent(student); setInviteOpen(true); }}>
                  Invitar a Entrevista
                </Button>
              }>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography>{student.full_name}</Typography>
                      <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                    </Stack>
                  }
                  secondary={`Curso: ${student.course_code} — Estado: ${student.employment_status}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No hay candidatos recomendados</Typography>
        )}
      </Paper>

      <Dialog open={inviteOpen} onClose={() => { setInviteOpen(false); resetInviteForm(); }} fullWidth maxWidth="sm">
        <DialogTitle>Invitar a entrevista</DialogTitle>
        <DialogContent dividers>
          {submitOk && <Alert severity="success" sx={{ mb: 2 }}>{submitOk}</Alert>}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Alumno" value={inviteStudent?.full_name || ""} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="Lugar" value={place} onChange={(e) => setPlace(e.target.value)} fullWidth />
            <TextField label="Fecha y hora" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setInviteOpen(false); resetInviteForm(); }}>Cancelar</Button>
          <Button variant="contained" onClick={submitInvitation} disabled={!inviteStudent}>Enviar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
