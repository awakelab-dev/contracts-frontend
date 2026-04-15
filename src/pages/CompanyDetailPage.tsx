import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../lib/api";
import type { Company, CompanySector, Vacancy } from "../types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

function toNull(v: string) {
  const s = v.trim();
  return s ? s : null;
}

function sectorLabel(company: Company) {
  return company.sector_name ?? company.sector ?? null;
}

const EMPTY_EDIT_FORM = {
  name: "",
  fiscal_name: "",
  nif: "",
  sector_id: "",
  company_email: "",
  company_phone: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo = (location.state as any)?.from;
  const handleBack = () => {
    if (typeof backTo === "string" && backTo.startsWith("/")) navigate(backTo);
    else if (location.key !== "default") navigate(-1);
    else navigate("/companies");
  };

  const [company, setCompany] = useState<Company | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [sectors, setSectors] = useState<CompanySector[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    Promise.all([
      api.get<Company>(`/companies/${id}`),
      api.get<Vacancy[]>(`/vacancies`),
      api.get<CompanySector[]>(`/companies/sectors`),
    ])
      .then(([cRes, vRes, sRes]) => {
        if (cancel) return;
        setCompany(cRes.data);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setSectors(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const status = err?.response?.status;
        if (status === 404) setNotFound(true);
        else setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Error al cargar empresa");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [id]);

  const openCount = useMemo(() => {
    if (!company) return 0;
    return vacancies.filter((v) => v.company_id === company.id && v.status === "open").length;
  }, [company, vacancies]);

  function openEdit() {
    if (!company) return;
    setActionError(null);
    setActionOk(null);
    setEditError(null);
    setEditForm({
      name: company.name || "",
      fiscal_name: company.fiscal_name ?? "",
      nif: company.nif ?? "",
      sector_id: company.sector_id != null ? String(company.sector_id) : "",
      company_email: company.company_email ?? "",
      company_phone: company.company_phone ?? "",
      contact_name: company.contact_name ?? "",
      contact_email: company.contact_email ?? "",
      contact_phone: company.contact_phone ?? "",
      notes: company.notes ?? "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!company) return;

    const name = editForm.name.trim();
    if (!name) {
      setEditError("El nombre es obligatorio");
      return;
    }

    try {
      setEditSaving(true);
      setEditError(null);
      setActionError(null);
      setActionOk(null);

      const payload = {
        name,
        fiscal_name: toNull(editForm.fiscal_name),
        nif: toNull(editForm.nif),
        sector_id: editForm.sector_id ? Number(editForm.sector_id) : null,
        company_email: toNull(editForm.company_email),
        company_phone: toNull(editForm.company_phone),
        contact_name: toNull(editForm.contact_name),
        contact_email: toNull(editForm.contact_email),
        contact_phone: toNull(editForm.contact_phone),
        notes: toNull(editForm.notes),
      };

      await api.put(`/companies/${company.id}`, payload);
      const { data } = await api.get<Company>(`/companies/${company.id}`);
      setCompany(data);
      setActionOk("Empresa actualizada");
      setEditOpen(false);
    } catch (e: any) {
      setEditError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al guardar empresa");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteCompany() {
    if (!company) return;
    const ok = window.confirm("¿Eliminar esta empresa?\nSe eliminarán también las vacantes asociadas.");
    if (!ok) return;

    try {
      setActionError(null);
      setActionOk(null);
      await api.delete(`/companies/${company.id}`);
      navigate("/companies");
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al eliminar empresa");
    }
  }

  if (loading) return <Typography>Cargando…</Typography>;
  if (notFound)
    return (
      <Box>
        <Typography variant="h6">Empresa no encontrada (404)</Typography>
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver a empresas
        </Button>
      </Box>
    );
  if (error)
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver a empresas
        </Button>
      </Box>
    );
  if (!company) return null;

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} mb={2}>
        <Typography variant="h5">{company.name}</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={openEdit}>
            Editar
          </Button>
          <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={deleteCompany}>
            Eliminar
          </Button>
          <Button onClick={handleBack}>Volver</Button>
        </Stack>
      </Stack>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {actionOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setActionOk(null)}>
          {actionOk}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.2}>
          <Typography>
            <strong>Código:</strong> {company.id}
          </Typography>
          <Typography>
            <strong>Nombre comercial:</strong> {company.name}
          </Typography>
          <Typography>
            <strong>Nombre fiscal:</strong> {company.fiscal_name ?? "-"}
          </Typography>
          <Typography>
            <strong>NIF:</strong> {company.nif ?? "-"}
          </Typography>
          <Typography>
            <strong>Email empresa:</strong> {company.company_email ?? "-"}
          </Typography>
          <Typography>
            <strong>Tlf empresa:</strong> {company.company_phone ?? "-"}
          </Typography>
          <Typography>
            <strong>Sector:</strong> <Chip label={sectorLabel(company) ?? "-"} size="small" />
          </Typography>
          <Typography>
            <strong>Contacto:</strong> {company.contact_name ?? "-"}
          </Typography>
          <Typography>
            <strong>Email contacto:</strong> {company.contact_email ?? "-"}
          </Typography>
          <Typography>
            <strong>Vacantes abiertas:</strong> {openCount}
          </Typography>
          <Typography>
            <strong>Notas:</strong> {company.notes ?? "-"}
          </Typography>
        </Stack>
      </Paper>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Editar empresa</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {editError && (
              <Alert severity="error" onClose={() => setEditError(null)}>
                {editError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nombre comercial"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nombre fiscal"
                  value={editForm.fiscal_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, fiscal_name: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="NIF / CIF"
                  value={editForm.nif}
                  onChange={(e) => setEditForm((p) => ({ ...p, nif: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Sector"
                  value={editForm.sector_id}
                  onChange={(e) => setEditForm((p) => ({ ...p, sector_id: e.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">
                    <em>Sin sector</em>
                  </MenuItem>
                  {sectors.map((s) => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.sector_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Email empresa"
                  value={editForm.company_email}
                  onChange={(e) => setEditForm((p) => ({ ...p, company_email: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Tlf empresa"
                  value={editForm.company_phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, company_phone: e.target.value }))}
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Contacto"
                  value={editForm.contact_name}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_name: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Email contacto"
                  value={editForm.contact_email}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_email: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Tlf contacto"
                  value={editForm.contact_phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, contact_phone: e.target.value }))}
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Notas"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={editSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveEdit} disabled={editSaving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
