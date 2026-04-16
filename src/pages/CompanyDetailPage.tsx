import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import api from "../lib/api";
import type { Company, CompanyPracticeCenter, CompanySector, Vacancy } from "../types";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

function toNull(v: string) {
  const s = v.trim();
  return s ? s : null;
}

function toUpper(v: string) {
  return v.trim().toLocaleUpperCase("es-ES");
}

function toNullUpper(v: string) {
  const s = toUpper(v);
  return s ? s : null;
}

function toLower(v: string) {
  return v.trim().toLocaleLowerCase("es-ES");
}

function toNullLower(v: string) {
  const s = toLower(v);
  return s ? s : null;
}

function sectorLabel(company: Company) {
  return company.sector_name ?? company.sector ?? null;
}

const EMPTY_EDIT_FORM = {
  name: "",
  fiscal_name: "",
  cif: "",
  sector_name: "",
  company_email: "",
  company_phone: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  has_complex_practice_centers: false,
  notes: "",
};

const EMPTY_PRACTICE_CENTER_FORM = {
  address: "",
  sector: "",
  center: "",
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
  const [practiceCenters, setPracticeCenters] = useState<CompanyPracticeCenter[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
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

  const [practiceCenterOpen, setPracticeCenterOpen] = useState(false);
  const [practiceCenterSaving, setPracticeCenterSaving] = useState(false);
  const [practiceCenterError, setPracticeCenterError] = useState<string | null>(null);
  const [editingPracticeCenterId, setEditingPracticeCenterId] = useState<number | null>(null);
  const [practiceCenterForm, setPracticeCenterForm] = useState({ ...EMPTY_PRACTICE_CENTER_FORM });

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
      api.get<Company[]>(`/companies`),
      api.get<CompanyPracticeCenter[]>(`/companies/${id}/practice-centers`),
    ])
      .then(([cRes, vRes, sRes, allCompaniesRes, centersRes]) => {
        if (cancel) return;
        setCompany(cRes.data);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setSectors(Array.isArray(sRes.data) ? sRes.data : []);
        setAllCompanies(Array.isArray(allCompaniesRes.data) ? allCompaniesRes.data : []);
        setPracticeCenters(Array.isArray(centersRes.data) ? centersRes.data : []);
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

  const companyNameOptions = useMemo(() => {
    return Array.from(
      new Set(
        allCompanies
          .map((c) => c.name.trim())
          .filter((name) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [allCompanies]);

  const sectorOptions = useMemo(() => {
    return Array.from(
      new Set(
        sectors
          .map((s) => s.sector_name.trim())
          .filter((sector) => sector.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [sectors]);

  const practiceCenterSectorOptions = useMemo(() => {
    return Array.from(
      new Set(
        practiceCenters
          .map((pc) => (pc.sector ?? "").trim())
          .filter((sector) => sector.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [practiceCenters]);

  const hasComplexPracticeCenters = Boolean(Number(company?.has_complex_practice_centers ?? 0));

  async function reloadPracticeCenters(companyId: number) {
    const { data } = await api.get<CompanyPracticeCenter[]>(`/companies/${companyId}/practice-centers`);
    setPracticeCenters(Array.isArray(data) ? data : []);
  }

  function openEdit() {
    if (!company) return;
    setActionError(null);
    setActionOk(null);
    setEditError(null);
    setEditForm({
      name: company.name || "",
      fiscal_name: company.fiscal_name ?? "",
      cif: company.cif ?? "",
      sector_name: sectorLabel(company) ?? "",
      company_email: company.company_email ?? "",
      company_phone: company.company_phone ?? "",
      contact_name: company.contact_name ?? "",
      contact_email: company.contact_email ?? "",
      contact_phone: company.contact_phone ?? "",
      has_complex_practice_centers: Boolean(Number(company.has_complex_practice_centers ?? 0)),
      notes: company.notes ?? "",
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!company) return;
    const name = toUpper(editForm.name);
    if (!name) {
      setEditError("El nombre es obligatorio");
      return;
    }
    const sectorName = toUpper(editForm.sector_name);
    const matchedSector = sectorName
      ? sectors.find((s) => s.sector_name.trim().toLocaleUpperCase("es-ES") === sectorName)
      : null;

    try {
      setEditSaving(true);
      setEditError(null);
      setActionError(null);
      setActionOk(null);

      const payload = {
        name,
        fiscal_name: toNullUpper(editForm.fiscal_name),
        cif: toNull(editForm.cif),
        sector_id: matchedSector?.id ?? null,
        sector_name: sectorName || null,
        company_email: toNullLower(editForm.company_email),
        company_phone: toNull(editForm.company_phone),
        contact_name: toNullUpper(editForm.contact_name),
        contact_email: toNullLower(editForm.contact_email),
        contact_phone: toNull(editForm.contact_phone),
        has_complex_practice_centers: editForm.has_complex_practice_centers,
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

  function openCreatePracticeCenter() {
    setPracticeCenterError(null);
    setEditingPracticeCenterId(null);
    setPracticeCenterForm({ ...EMPTY_PRACTICE_CENTER_FORM });
    setPracticeCenterOpen(true);
  }

  function openEditPracticeCenter(practiceCenter: CompanyPracticeCenter) {
    setPracticeCenterError(null);
    setEditingPracticeCenterId(practiceCenter.id);
    setPracticeCenterForm({
      address: practiceCenter.address ?? "",
      sector: practiceCenter.sector ?? "",
      center: practiceCenter.center ?? "",
    });
    setPracticeCenterOpen(true);
  }

  async function savePracticeCenter() {
    if (!company) return;

    const address = toNull(practiceCenterForm.address);
    const sector = toNullUpper(practiceCenterForm.sector);
    const center = toNullUpper(practiceCenterForm.center);

    if (hasComplexPracticeCenters) {
      if (!sector || !center || !address) {
        setPracticeCenterError("Sector, Centro y Dirección son obligatorios");
        return;
      }
    } else if (!address) {
      setPracticeCenterError("La dirección es obligatoria");
      return;
    }

    const payload = {
      address,
      sector: hasComplexPracticeCenters ? sector : null,
      center: hasComplexPracticeCenters ? center : null,
    };

    try {
      setPracticeCenterSaving(true);
      setPracticeCenterError(null);
      setActionError(null);
      setActionOk(null);

      if (editingPracticeCenterId) {
        await api.put(`/companies/${company.id}/practice-centers/${editingPracticeCenterId}`, payload);
      } else {
        await api.post(`/companies/${company.id}/practice-centers`, payload);
      }
      await reloadPracticeCenters(company.id);
      setPracticeCenterOpen(false);
      setActionOk(editingPracticeCenterId ? "Dirección de prácticas actualizada" : "Dirección de prácticas creada");
    } catch (e: any) {
      setPracticeCenterError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Error al guardar dirección de prácticas"
      );
    } finally {
      setPracticeCenterSaving(false);
    }
  }

  async function deletePracticeCenter(practiceCenterId: number) {
    if (!company) return;
    const ok = window.confirm("¿Eliminar esta dirección de centro de prácticas?");
    if (!ok) return;

    try {
      setActionError(null);
      setActionOk(null);
      await api.delete(`/companies/${company.id}/practice-centers/${practiceCenterId}`);
      await reloadPracticeCenters(company.id);
      setActionOk("Dirección de prácticas eliminada");
    } catch (e: any) {
      setActionError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Error al eliminar dirección de prácticas"
      );
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
            <strong>CIF:</strong> {company.cif ?? "-"}
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
            <strong>Estructura multi-dirección:</strong> {hasComplexPracticeCenters ? "Compleja (Sector + Centro)" : "Simple (Dirección)"}
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

      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack spacing={1.5}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Typography variant="h6">Dirección de Centro de Prácticas</Typography>
            <Button variant="outlined" onClick={openCreatePracticeCenter}>
              Agregar
            </Button>
          </Stack>

          {practiceCenters.length === 0 ? (
            <Typography color="text.secondary">No hay direcciones de prácticas registradas.</Typography>
          ) : (
            <Stack spacing={1}>
              {practiceCenters.map((practiceCenter) => (
                <Paper key={practiceCenter.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Stack spacing={0.4}>
                      {hasComplexPracticeCenters ? (
                        <>
                          <Typography variant="body2">
                            <strong>Sector:</strong> {practiceCenter.sector ?? "-"}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Centro:</strong> {practiceCenter.center ?? "-"}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Dirección:</strong> {practiceCenter.address ?? "-"}
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2">
                          <strong>Dirección:</strong> {practiceCenter.address ?? "-"}
                        </Typography>
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => openEditPracticeCenter(practiceCenter)}>
                        Editar
                      </Button>
                      <Button size="small" color="error" onClick={() => deletePracticeCenter(practiceCenter.id)}>
                        Eliminar
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
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
                <Autocomplete
                  freeSolo
                  options={companyNameOptions}
                  value={editForm.name}
                  onInputChange={(_, value) => setEditForm((p) => ({ ...p, name: value }))}
                  onChange={(_, value) =>
                    setEditForm((p) => ({ ...p, name: typeof value === "string" ? value : "" }))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nombre comercial"
                      required
                      fullWidth
                    />
                  )}
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
                  label="CIF"
                  value={editForm.cif}
                  onChange={(e) => setEditForm((p) => ({ ...p, cif: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Autocomplete
                  freeSolo
                  options={sectorOptions}
                  value={editForm.sector_name}
                  onInputChange={(_, value) => setEditForm((p) => ({ ...p, sector_name: value }))}
                  onChange={(_, value) => setEditForm((p) => ({ ...p, sector_name: value ?? "" }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sector"
                      fullWidth
                    />
                  )}
                />
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
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editForm.has_complex_practice_centers}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, has_complex_practice_centers: e.target.checked }))
                      }
                    />
                  }
                  label="Estructura ampliada para Dirección de Centro de Prácticas"
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

      <Dialog open={practiceCenterOpen} onClose={() => setPracticeCenterOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingPracticeCenterId ? "Editar dirección de prácticas" : "Agregar dirección de prácticas"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {practiceCenterError && (
              <Alert severity="error" onClose={() => setPracticeCenterError(null)}>
                {practiceCenterError}
              </Alert>
            )}

            {hasComplexPracticeCenters ? (
              <>
                <Autocomplete
                  freeSolo
                  options={practiceCenterSectorOptions}
                  value={practiceCenterForm.sector}
                  onInputChange={(_, value) => setPracticeCenterForm((p) => ({ ...p, sector: value }))}
                  onChange={(_, value) => setPracticeCenterForm((p) => ({ ...p, sector: value ?? "" }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Sector"
                      fullWidth
                    />
                  )}
                />
                <TextField
                  label="Centro"
                  value={practiceCenterForm.center}
                  onChange={(e) => setPracticeCenterForm((p) => ({ ...p, center: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Dirección"
                  value={practiceCenterForm.address}
                  onChange={(e) => setPracticeCenterForm((p) => ({ ...p, address: e.target.value }))}
                  fullWidth
                />
              </>
            ) : (
              <TextField
                label="Dirección de Centro de Prácticas"
                value={practiceCenterForm.address}
                onChange={(e) => setPracticeCenterForm((p) => ({ ...p, address: e.target.value }))}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPracticeCenterOpen(false)} disabled={practiceCenterSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={savePracticeCenter} disabled={practiceCenterSaving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
