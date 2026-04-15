import { useMemo, useState, useEffect } from "react";
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
  InputAdornment,
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
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Company, CompanySector, Vacancy } from "../types";

function sectorChip(sector?: string | null) {
  const s = sector || "-";
  const map: Record<string, "default" | "primary" | "success" | "warning"> = {
    Hostelería: "primary",
    Construcción: "warning",
    Comercio: "success",
  };
  const color = map[s] ?? "default";
  return <Chip label={s} color={color} size="small" variant={color === "default" ? "outlined" : "filled"} />;
}

function toNull(v: string) {
  const s = v.trim();
  return s ? s : null;
}

function sectorLabel(company: Company) {
  return company.sector_name ?? company.sector ?? null;
}

const EMPTY_CREATE_FORM = {
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

export default function CompaniesListPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [sectors, setSectors] = useState<CompanySector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE_FORM });

  async function reloadCompanies() {
    const { data } = await api.get<Company[]>("/companies");
    setCompanies(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.get<Company[]>("/companies"),
      api.get<Vacancy[]>("/vacancies"),
      api.get<CompanySector[]>("/companies/sectors"),
    ])
      .then(([cRes, vRes, sRes]) => {
        if (cancel) return;
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setSectors(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Error al cargar empresas";
        setError(msg);
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, []);

  function openCreate() {
    setCreateError(null);
    setCreateForm({ ...EMPTY_CREATE_FORM });
    setCreateOpen(true);
  }

  async function createCompany() {
    const name = createForm.name.trim();
    if (!name) {
      setCreateError("El nombre es obligatorio");
      return;
    }

    try {
      setCreateSaving(true);
      setCreateError(null);

      const payload = {
        name,
        fiscal_name: toNull(createForm.fiscal_name),
        nif: toNull(createForm.nif),
        sector_id: createForm.sector_id ? Number(createForm.sector_id) : null,
        company_email: toNull(createForm.company_email),
        company_phone: toNull(createForm.company_phone),
        contact_name: toNull(createForm.contact_name),
        contact_email: toNull(createForm.contact_email),
        contact_phone: toNull(createForm.contact_phone),
        notes: toNull(createForm.notes),
      };

      await api.post("/companies", payload);
      await reloadCompanies();
      setPage(0);
      setCreateOpen(false);
    } catch (e: any) {
      setCreateError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al crear empresa");
    } finally {
      setCreateSaving(false);
    }
  }

  const openByCompany = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of vacancies) {
      if (v.status === "open") {
        map.set(v.company_id, (map.get(v.company_id) || 0) + 1);
      }
    }
    return map;
  }, [vacancies]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = companies.map((c) => ({
      ...c,
      vacanciesOpen: openByCompany.get(c.id) || 0,
      sectorResolved: sectorLabel(c) || "",
    }));

    if (!term) return list;
    return list.filter((c) =>
      [
        c.nif ?? "",
        c.name,
        c.fiscal_name ?? "",
        c.sectorResolved,
        c.company_email ?? "",
        c.company_phone ?? "",
        c.contact_name ?? "",
        c.contact_email ?? "",
      ].some((f) => f.toLowerCase().includes(term))
    );
  }, [q, companies, openByCompany]);

  useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Empresas</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField
            size="small"
            placeholder="Buscar por código, nombre, sector, email o contacto"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openCreate}>
            Agregar empresa nueva
          </Button>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre / Razón Social</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Vacantes</TableCell>
              <TableCell>Contacto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              pagedRows.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/companies/${c.id}`);
                  }}
                >
                  <TableCell>
                    <Stack spacing={0.2}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Código: {c.id} · NIF: {c.nif ?? "-"}
                      </Typography>
                      {!!c.fiscal_name && (
                        <Typography variant="caption" color="text.secondary">
                          Fiscal: {c.fiscal_name}
                        </Typography>
                      )}
                      {(c.company_email || c.company_phone) && (
                        <Typography variant="caption" color="text.secondary">
                          {[c.company_email, c.company_phone].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{sectorChip(sectorLabel(c))}</TableCell>
                  <TableCell>
                    <Chip label={`${c.vacanciesOpen} abiertas`} size="small" color={c.vacanciesOpen > 0 ? "success" : "default"} />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.2}>
                      <Typography variant="body2">{c.contact_name ?? "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.contact_email ?? ""}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay resultados
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
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Agregar empresa nueva</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {createError && (
              <Alert severity="error" onClose={() => setCreateError(null)}>
                {createError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nombre comercial"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nombre fiscal"
                  value={createForm.fiscal_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, fiscal_name: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="NIF / CIF"
                  value={createForm.nif}
                  onChange={(e) => setCreateForm((p) => ({ ...p, nif: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Sector"
                  value={createForm.sector_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, sector_id: e.target.value }))}
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
                  value={createForm.company_email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, company_email: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Tlf empresa"
                  value={createForm.company_phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, company_phone: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Persona contacto"
                  value={createForm.contact_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, contact_name: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Email contacto"
                  value={createForm.contact_email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, contact_email: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Tlf contacto"
                  value={createForm.contact_phone}
                  onChange={(e) => setCreateForm((p) => ({ ...p, contact_phone: e.target.value }))}
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Notas"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={createSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={createCompany} disabled={createSaving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
