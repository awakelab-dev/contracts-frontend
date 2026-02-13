import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../lib/api";
import type { Vacancy, Company, Student, Interview } from "../types";
import { scoreColor } from "../utils/MatchingEngine";
import { formatDateDMY } from "../utils/date";

function statusChip(s: Vacancy["status"]) {
  return s === "open" ? <Chip label="Abierta" color="success" size="small" /> : <Chip label="Cerrada" size="small" />;
}

export default function VacancyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo = (location.state as any)?.from;
  const handleBack = () => {
    if (typeof backTo === "string" && backTo.startsWith("/")) navigate(backTo);
    else if (location.key !== "default") navigate(-1);
    else navigate("/vacancies");
  };

  type MatchingStudentApiRow = Student & { score: number; matched_topics_count: number };

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recommended, setRecommended] = useState<Array<{ student: Student; score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  // Vacancy CRUD dialog
  const [vacancyDialogOpen, setVacancyDialogOpen] = useState(false);
  const [vacancySaving, setVacancySaving] = useState(false);
  const [vacancyForm, setVacancyForm] = useState<{
    id?: number;
    company_id: string;
    title: string;
    sector: string;
    description: string;
    requirements: string;
    status: Vacancy["status"];
  }>({
    company_id: "",
    title: "",
    sector: "",
    description: "",
    requirements: "",
    status: "open",
  });

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
    setActionError(null);
    setActionOk(null);

    api.get<Vacancy>(`/vacancies/${id}`)
      .then(({ data }) => {
        if (cancel) return;
        setVacancy(data);
        return Promise.all([
          api.get<Company>(`/companies/${data.company_id}`),
          api.get<Company[]>(`/companies`),
          api.get<MatchingStudentApiRow[]>(`/matching/students`, { params: { vacancyId: data.id, limit: 50 } }),
        ]);
      })
      .then((res) => {
        if (cancel) return;
        if (res) {
          const [cRes, cAllRes, mRes] = res;
          setCompany(cRes.data);
          setCompanies(Array.isArray(cAllRes.data) ? cAllRes.data : []);

          const mr = Array.isArray(mRes.data) ? mRes.data : [];
          setRecommended(mr.slice(0, 5).map((s) => ({ student: s, score: s.score })));
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


  function openEditVacancy() {
    if (!vacancy) return;
    setActionError(null);
    setActionOk(null);
    setVacancyForm({
      id: vacancy.id,
      company_id: String(vacancy.company_id),
      title: vacancy.title || "",
      sector: vacancy.sector ?? "",
      description: vacancy.description ?? "",
      requirements: vacancy.requirements ?? "",
      status: vacancy.status,
    });
    setVacancyDialogOpen(true);
  }

  async function saveVacancy() {
    const title = vacancyForm.title.trim();

    if (!title) {
      setActionError("El título es obligatorio");
      return;
    }

    try {
      setActionError(null);
      setActionOk(null);
      setVacancySaving(true);
      if (!vacancyForm.id) return;

      await api.put(`/vacancies/${vacancyForm.id}`, {
        title,
        sector: vacancyForm.sector || null,
        description: vacancyForm.description || null,
        requirements: vacancyForm.requirements || null,
        status: vacancyForm.status,
      });

      const { data } = await api.get<Vacancy>(`/vacancies/${vacancyForm.id}`);
      setVacancy(data);
      setActionOk("Vacante actualizada");

      setVacancyDialogOpen(false);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar vacante");
    } finally {
      setVacancySaving(false);
    }
  }

  async function deleteVacancy() {
    if (!vacancy) return;
    const ok = window.confirm("¿Eliminar esta vacante?");
    if (!ok) return;

    try {
      setActionError(null);
      setActionOk(null);
      await api.delete(`/vacancies/${vacancy.id}`);
      navigate("/vacancies");
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar vacante");
    }
  }

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
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver a vacantes
        </Button>
      </Box>
    );
  if (error)
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver a vacantes
        </Button>
      </Box>
    );
  if (!vacancy) return null;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        mb={2}
        spacing={1}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">{vacancy.title}</Typography>
          {statusChip(vacancy.status)}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={openEditVacancy}>
            Editar
          </Button>
          <Button size="small" color="error" variant="outlined" onClick={deleteVacancy}>
            Eliminar
          </Button>
          <Button onClick={handleBack} size="small">
            Volver
          </Button>
        </Stack>
      </Stack>

      {actionOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionOk(null)}>
          {actionOk}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, flex: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Información</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Typography><strong>Empresa:</strong> {company?.name || `Empresa #${vacancy.company_id}`}</Typography>
            <Typography><strong>Sector:</strong> {vacancy.sector ?? "-"}</Typography>
            <Typography><strong>Fecha creación:</strong> {formatDateDMY(vacancy.created_at)}</Typography>
            <Typography sx={{ whiteSpace: "pre-line" }}>
              <strong>Descripción:</strong> {vacancy.description ?? "-"}
            </Typography>
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
                      <Typography>{`${student.first_names} ${student.last_names}`.trim()}</Typography>
                      <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                    </Stack>
                  }
                  secondary={`Distrito: ${student.district ?? '-'} — Estado: ${student.employment_status}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No hay candidatos recomendados</Typography>
        )}
      </Paper>

      <Dialog
        open={vacancyDialogOpen}
        onClose={() => setVacancyDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{vacancyForm.id ? "Editar vacante" : "Nueva vacante"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Empresa"
              select
              size="small"
              fullWidth
              disabled={!!vacancyForm.id}
              value={vacancyForm.company_id}
              onChange={(e) => setVacancyForm((f) => ({ ...f, company_id: e.target.value }))}
            >
              {companies.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Título"
              size="small"
              fullWidth
              value={vacancyForm.title}
              onChange={(e) => setVacancyForm((f) => ({ ...f, title: e.target.value }))}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Sector"
                size="small"
                fullWidth
                value={vacancyForm.sector}
                onChange={(e) => setVacancyForm((f) => ({ ...f, sector: e.target.value }))}
              />
              <TextField
                label="Estado"
                select
                size="small"
                fullWidth
                value={vacancyForm.status}
                onChange={(e) => setVacancyForm((f) => ({ ...f, status: e.target.value as any }))}
              >
                <MenuItem value="open">Abierta</MenuItem>
                <MenuItem value="closed">Cerrada</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Descripción"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={vacancyForm.description}
              onChange={(e) => setVacancyForm((f) => ({ ...f, description: e.target.value }))}
            />

            <TextField
              label="Requisitos"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={vacancyForm.requirements}
              onChange={(e) => setVacancyForm((f) => ({ ...f, requirements: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVacancyDialogOpen(false)} disabled={vacancySaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveVacancy}
            disabled={vacancySaving || !vacancyForm.title.trim() || (!vacancyForm.id && !vacancyForm.company_id)}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteOpen} onClose={() => { setInviteOpen(false); resetInviteForm(); }} fullWidth maxWidth="sm">
        <DialogTitle>Invitar a entrevista</DialogTitle>
        <DialogContent dividers>
          {submitOk && <Alert severity="success" sx={{ mb: 2 }}>{submitOk}</Alert>}
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Alumno" value={inviteStudent ? `${inviteStudent.first_names} ${inviteStudent.last_names}`.trim() : ""} InputProps={{ readOnly: true }} fullWidth />
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
