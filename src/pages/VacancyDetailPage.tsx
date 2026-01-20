import { useMemo, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box, Paper, Stack, Typography, Chip, Divider, List, ListItem, ListItemText, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert
} from "@mui/material";

type Vacancy = {
  id: number;
  title: string;
  company: string;
  sector: string;
  status: "open" | "closed";
  deadline?: string;
  requirements: string[];
  notes?: string;
};

const VACANCIES: Vacancy[] = [
  { id: 1, title: "Camarero/a terraza fin de semana", company: "R. PARAGUAS", sector: "Hostelería", status: "open", deadline: "2026-01-31", requirements: ["Curso EMHA 01", "Disponibilidad fines de semana", "Atención al cliente"] },
  { id: 2, title: "Runner restaurante alta gama", company: "TATEL", sector: "Hostelería", status: "open", deadline: "2026-02-10", requirements: ["Curso EMHA 01", "Energía y rapidez", "Trabajo en equipo"] },
  { id: 3, title: "Dependiente/a tienda urbana", company: "SNIPES ROPA", sector: "Comercio", status: "open", requirements: ["Experiencia en retail (deseable)", "Buena presencia", "Atención al cliente"] },
  { id: 4, title: "Operario/a de obra", company: "CONSTRUCCIONES GAHERJO, S.L.", sector: "Construcción", status: "closed", requirements: ["Disponibilidad inmediata"] },
];

type Candidate = { id: number; name: string; courseCode: string };
const CANDIDATES: Candidate[] = [
  { id: 1, name: "ANTHONY JOSUE BRUFAU MODESTO", courseCode: "EMHA 01" },
  { id: 2, name: "DELIA FERNANDINO LÓPEZ", courseCode: "EMHA 01" },
  { id: 4, name: "JEROME MICHAEL MASONGSONG", courseCode: "EMHA 01" },
  { id: 10, name: "SOFIA AGUILAR LUQUE", courseCode: "EMHA 01" },
];

function statusChip(s: Vacancy["status"]) {
  return s === "open" ? <Chip label="Abierta" color="success" size="small" /> : <Chip label="Cerrada" size="small" />;
}

export default function VacancyDetailPage() {
  const { id } = useParams();
  const vacancy = useMemo(() => VACANCIES.find(v => String(v.id) === String(id)), [id]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<number | "">("");
  const [justCreated, setJustCreated] = useState<{ studentId: number; name: string } | null>(null);

  if (!vacancy) {
    return (
      <Box>
        <Typography variant="h6">Vacante no encontrada</Typography>
        <Button component={RouterLink} to="/vacancies" sx={{ mt: 1 }}>Volver a vacantes</Button>
      </Box>
    );
  }

  const onCreateInvitation = () => {
    if (!selected) return;
    const cand = CANDIDATES.find(c => c.id === Number(selected));
    if (cand) {
      // MODO FAKE: simulamos creación
      setJustCreated({ studentId: cand.id, name: cand.name });
    }
    setInviteOpen(false);
    setSelected("");
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">{vacancy.title}</Typography>
          {statusChip(vacancy.status)}
        </Stack>
        <Button component={RouterLink} to="/vacancies">Volver</Button>
      </Stack>

      {justCreated && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Invitación creada (fake) para <strong>{justCreated.name}</strong>.
          Puedes verla en la sección “Invitaciones”.
        </Alert>
      )}

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
        <Paper sx={{ p: 2, flex: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Información</Typography>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={1}>
            <Typography><strong>Empresa:</strong> {vacancy.company}</Typography>
            <Typography><strong>Sector:</strong> {vacancy.sector}</Typography>
            <Typography><strong>Fecha límite:</strong> {vacancy.deadline ?? "-"}</Typography>
            {vacancy.notes && <Typography color="text.secondary">{vacancy.notes}</Typography>}
          </Stack>
        </Paper>

        <Paper sx={{ p: 2, flex: 1, minWidth: 280 }}>
          <Typography variant="subtitle1" gutterBottom>Requisitos</Typography>
          <Divider sx={{ mb: 2 }} />
          <List dense>
            {vacancy.requirements.map((r, idx) => (
              <ListItem key={idx} disableGutters>
                <ListItemText primary={r} />
              </ListItem>
            ))}
          </List>

          <Stack direction="row" spacing={1} mt={1}>
            <Button component={RouterLink} to="/matching" variant="outlined">Ver matching</Button>
            <Button
              variant="contained"
              disabled={vacancy.status !== "open"}
              onClick={() => setInviteOpen(true)}
            >
              Crear invitación
            </Button>
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Crear invitación (fake)</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Selecciona candidato"
            value={selected}
            onChange={(e) => setSelected(e.target.value as any)}
            fullWidth
            sx={{ mt: 1 }}
          >
            {CANDIDATES.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.name} — {c.courseCode}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Esta acción simula la creación de una invitación y no llama al API.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteOpen(false)}>Cancelar</Button>
          <Button onClick={onCreateInvitation} variant="contained" disabled={!selected}>Crear</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}