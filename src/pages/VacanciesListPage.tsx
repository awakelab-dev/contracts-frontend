import { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Vacancy, Company, CompanyPracticeCenter } from "../types";
import DownloadIcon from "@mui/icons-material/Download";
import { exportToCsv } from "../utils/CsvExporter";
import type { CsvColumn } from "../utils/CsvExporter";

type VacancyForm = {
  company_name: string;
  company_fiscal_name: string;
  company_id: string;
  sector: string;
  practice_center_sector: string;
  practice_center_id: string;
  workplace: string;
  title: string;
  description: string;
  requirements: string;
  horarios: string;
  tipo_contrato: string;
  sueldo_aproximado_bruto_anual: string;
  status: Vacancy["status"];
};

const EMPTY_VACANCY_FORM: VacancyForm = {
  company_name: "",
  company_fiscal_name: "",
  company_id: "",
  sector: "",
  practice_center_sector: "",
  practice_center_id: "",
  workplace: "",
  title: "",
  description: "",
  requirements: "",
  horarios: "",
  tipo_contrato: "",
  sueldo_aproximado_bruto_anual: "",
  status: "open",
};

function statusChip(status: Vacancy["status"]) {
  return status === "open" ? (
    <Chip label="Activa" color="success" size="small" />
  ) : (
    <Chip label="Inactiva" size="small" />
  );
}

function parseCode(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function salaryText(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });
}

export default function VacanciesListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "open" | "closed">("all");
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [vacancyDialogOpen, setVacancyDialogOpen] = useState(false);
  const [vacancySaving, setVacancySaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [vacancyForm, setVacancyForm] = useState<VacancyForm>(EMPTY_VACANCY_FORM);

  const [vacancyCompanyCenters, setVacancyCompanyCenters] = useState<CompanyPracticeCenter[]>([]);
  const [vacancyCompanyCentersLoading, setVacancyCompanyCentersLoading] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    Promise.all([api.get<Vacancy[]>("/vacancies"), api.get<Company[]>("/companies")])
      .then(([vRes, cRes]) => {
        if (cancel) return;
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar vacantes";
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

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of companies) m.set(c.id, c.name);
    return m;
  }, [companies]);

  const companyNameOptions = useMemo(() => {
    return Array.from(
      new Set(
        companies
          .map((c) => c.name.trim())
          .filter((name) => name.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [companies]);

  const companiesForSelectedName = useMemo(() => {
    if (!vacancyForm.company_name) return [];
    return companies
      .filter((c) => c.name === vacancyForm.company_name && (c.fiscal_name ?? "").trim().length > 0)
      .sort((a, b) =>
        (a.fiscal_name ?? "").localeCompare(b.fiscal_name ?? "", "es", { sensitivity: "base" })
      );
  }, [companies, vacancyForm.company_name]);

  const fiscalNameOptions = useMemo(() => {
    return Array.from(
      new Set(
        companiesForSelectedName
          .map((c) => (c.fiscal_name ?? "").trim())
          .filter((fiscalName) => fiscalName.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [companiesForSelectedName]);

  const selectedCompanyId = useMemo(
    () => parseCode(vacancyForm.company_id),
    [vacancyForm.company_id]
  );

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) ?? null;
  }, [companies, selectedCompanyId]);

  const selectedCompanyHasComplexLayout = Boolean(
    Number(selectedCompany?.has_complex_practice_centers ?? 0)
  );

  const practiceCenterSectorOptions = useMemo(() => {
    return Array.from(
      new Set(
        vacancyCompanyCenters
          .map((pc) => (pc.sector ?? "").trim())
          .filter((sector) => sector.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [vacancyCompanyCenters]);

  const practiceCenterOptionsForSelectedSector = useMemo(() => {
    if (!selectedCompanyHasComplexLayout) return [];
    if (!vacancyForm.practice_center_sector) return [];
    return vacancyCompanyCenters
      .filter(
        (pc) =>
          (pc.sector ?? "").trim() === vacancyForm.practice_center_sector &&
          (pc.center ?? "").trim().length > 0
      )
      .sort((a, b) => (a.center ?? "").localeCompare(b.center ?? "", "es", { sensitivity: "base" }));
  }, [vacancyCompanyCenters, vacancyForm.practice_center_sector, selectedCompanyHasComplexLayout]);

  const practiceCenterAddressOptions = useMemo(() => {
    if (selectedCompanyHasComplexLayout) return [];
    return vacancyCompanyCenters
      .filter((pc) => (pc.address ?? "").trim().length > 0)
      .sort((a, b) => (a.address ?? "").localeCompare(b.address ?? "", "es", { sensitivity: "base" }));
  }, [vacancyCompanyCenters, selectedCompanyHasComplexLayout]);

  useEffect(() => {
    setVacancyForm((f) => {
      if (!f.company_name) {
        if (
          !f.company_fiscal_name &&
          !f.company_id &&
          !f.sector &&
          !f.practice_center_sector &&
          !f.practice_center_id &&
          !f.workplace
        ) {
          return f;
        }
        return {
          ...f,
          company_fiscal_name: "",
          company_id: "",
          sector: "",
          practice_center_sector: "",
          practice_center_id: "",
          workplace: "",
        };
      }

      const fiscalSet = new Set(fiscalNameOptions);
      let nextFiscalName = f.company_fiscal_name;
      let nextCompanyId = f.company_id;

      if (nextFiscalName && !fiscalSet.has(nextFiscalName)) {
        nextFiscalName = "";
        nextCompanyId = "";
      }

      if (!nextFiscalName && fiscalNameOptions.length === 1) {
        nextFiscalName = fiscalNameOptions[0];
      }

      if (nextFiscalName) {
        const matchedCompany = companiesForSelectedName.find(
          (c) => (c.fiscal_name ?? "").trim() === nextFiscalName
        );
        const matchedCompanyId = matchedCompany ? String(matchedCompany.id) : "";
        if (matchedCompanyId && nextCompanyId !== matchedCompanyId) {
          nextCompanyId = matchedCompanyId;
        }
      }

      if (!nextFiscalName && nextCompanyId) {
        nextCompanyId = "";
      }

      const companyChanged = nextCompanyId !== f.company_id;
      const nextCompany = nextCompanyId
        ? companies.find((c) => String(c.id) === nextCompanyId) ?? null
        : null;
      const nextSector = companyChanged
        ? (nextCompany?.sector_name ?? nextCompany?.sector ?? "")
        : f.sector;
      const nextCenterSector = companyChanged ? "" : f.practice_center_sector;
      const nextCenterId = companyChanged ? "" : f.practice_center_id;
      const nextWorkplace = companyChanged ? "" : f.workplace;

      if (
        nextFiscalName === f.company_fiscal_name &&
        nextCompanyId === f.company_id &&
        nextSector === f.sector &&
        nextCenterSector === f.practice_center_sector &&
        nextCenterId === f.practice_center_id &&
        nextWorkplace === f.workplace
      ) {
        return f;
      }

      return {
        ...f,
        company_fiscal_name: nextFiscalName,
        company_id: nextCompanyId,
        sector: nextSector,
        practice_center_sector: nextCenterSector,
        practice_center_id: nextCenterId,
        workplace: nextWorkplace,
      };
    });
  }, [companies, companiesForSelectedName, fiscalNameOptions, vacancyForm.company_name]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setVacancyCompanyCenters([]);
      setVacancyCompanyCentersLoading(false);
      return;
    }

    let cancel = false;
    setVacancyCompanyCentersLoading(true);
    api
      .get<CompanyPracticeCenter[]>(`/companies/${selectedCompanyId}/practice-centers`)
      .then((res) => {
        if (cancel) return;
        setVacancyCompanyCenters(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (cancel) return;
        setVacancyCompanyCenters([]);
      })
      .finally(() => {
        if (cancel) return;
        setVacancyCompanyCentersLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;

    setVacancyForm((f) => {
      if (vacancyCompanyCenters.length === 0) {
        if (!f.practice_center_sector && !f.practice_center_id) return f;
        return { ...f, practice_center_sector: "", practice_center_id: "" };
      }

      if (selectedCompanyHasComplexLayout) {
        let nextSector = f.practice_center_sector;
        let nextCenterId = f.practice_center_id;
        let nextWorkplace = "";

        if (nextSector && !practiceCenterSectorOptions.includes(nextSector)) {
          nextSector = "";
        }
        if (!nextSector && practiceCenterSectorOptions.length === 1) {
          nextSector = practiceCenterSectorOptions[0];
        }

        const scopedCenters = vacancyCompanyCenters.filter(
          (pc) => (pc.sector ?? "").trim() === nextSector
        );
        if (nextCenterId && !scopedCenters.some((pc) => String(pc.id) === nextCenterId)) {
          nextCenterId = "";
        }

        const selectedCenter = scopedCenters.find((pc) => String(pc.id) === nextCenterId);
        nextWorkplace = selectedCenter?.address ?? "";

        if (
          nextSector === f.practice_center_sector &&
          nextCenterId === f.practice_center_id &&
          nextWorkplace === f.workplace
        ) {
          return f;
        }

        return {
          ...f,
          practice_center_sector: nextSector,
          practice_center_id: nextCenterId,
          workplace: nextWorkplace,
        };
      }

      let nextCenterId = f.practice_center_id;
      let nextWorkplace = f.workplace;

      if (nextCenterId && !practiceCenterAddressOptions.some((pc) => String(pc.id) === nextCenterId)) {
        nextCenterId = "";
      }

      if (!nextCenterId && nextWorkplace) {
        const matchByAddress = practiceCenterAddressOptions.find((pc) => (pc.address ?? "") === nextWorkplace);
        if (matchByAddress) {
          nextCenterId = String(matchByAddress.id);
        }
      }

      if (!nextCenterId && practiceCenterAddressOptions.length === 1) {
        nextCenterId = String(practiceCenterAddressOptions[0].id);
      }

      const selectedCenter = practiceCenterAddressOptions.find((pc) => String(pc.id) === nextCenterId);
      if (selectedCenter?.address) {
        nextWorkplace = selectedCenter.address;
      }

      if (
        nextCenterId === f.practice_center_id &&
        nextWorkplace === f.workplace &&
        !f.practice_center_sector
      ) {
        return f;
      }

      return {
        ...f,
        practice_center_sector: "",
        practice_center_id: nextCenterId,
        workplace: nextWorkplace,
      };
    });
  }, [
    selectedCompanyId,
    selectedCompanyHasComplexLayout,
    vacancyCompanyCenters,
    practiceCenterSectorOptions,
    practiceCenterAddressOptions,
  ]);

  function openCreateVacancy() {
    setActionError(null);
    setActionOk(null);
    setVacancyCompanyCenters([]);
    setVacancyForm(EMPTY_VACANCY_FORM);
    setVacancyDialogOpen(true);
  }

  async function saveVacancy() {
    const title = vacancyForm.title.trim();
    const companyId = parseCode(vacancyForm.company_id);
    const practiceCenterId = parseCode(vacancyForm.practice_center_id);
    const sueldo = vacancyForm.sueldo_aproximado_bruto_anual.trim();

    if (!title) {
      setActionError("El puesto de trabajo es obligatorio.");
      return;
    }
    if (!companyId) {
      setActionError("Debes seleccionar Nombre comercial y Nombre fiscal de empresa.");
      return;
    }
    if (vacancyCompanyCenters.length > 0) {
      if (selectedCompanyHasComplexLayout) {
        if (!vacancyForm.practice_center_sector || !practiceCenterId || !vacancyForm.workplace.trim()) {
          setActionError("Selecciona Sector, Centro y Dirección de Centro de Prácticas.");
          return;
        }
      } else if (!practiceCenterId || !vacancyForm.workplace.trim()) {
        setActionError("Selecciona una Dirección de Centro de Prácticas.");
        return;
      }
    }
    if (sueldo && !Number.isFinite(Number(sueldo))) {
      setActionError("Sueldo Aproximado (Bruto Anual) debe ser numérico.");
      return;
    }

    try {
      setActionError(null);
      setActionOk(null);
      setVacancySaving(true);

      await api.post(`/vacancies`, {
        company_id: companyId,
        practice_center_id: practiceCenterId,
        workplace: vacancyForm.workplace || null,
        title,
        sector: vacancyForm.sector || null,
        description: vacancyForm.description || null,
        requirements: vacancyForm.requirements || null,
        horarios: vacancyForm.horarios || null,
        tipo_contrato: vacancyForm.tipo_contrato || null,
        sueldo_aproximado_bruto_anual: sueldo ? Number(sueldo) : null,
        status: vacancyForm.status,
      });

      const { data } = await api.get<Vacancy[]>("/vacancies");
      setVacancies(Array.isArray(data) ? data : []);
      setVacancyDialogOpen(false);
      setActionOk("Vacante creada.");
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar vacante.");
    } finally {
      setVacancySaving(false);
    }
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = vacancies.map((v) => ({
      ...v,
      company: v.company_name || companyName.get(v.company_id) || `Empresa #${v.company_id}`,
    }));
    return list.filter((v) => {
      const salaryCandidate = v.sueldo_aproximado_bruto_anual != null ? String(v.sueldo_aproximado_bruto_anual) : "";
      return (
        (st === "all" || v.status === st) &&
        [v.title, v.company, v.sector ?? "", v.tipo_contrato ?? "", salaryCandidate]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    });
  }, [q, st, vacancies, companyName]);

  useEffect(() => {
    setPage(0);
  }, [q, st]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  const onExport = () => {
    const cols: CsvColumn<(typeof rows)[number]>[] = [
      { label: "Puesto de trabajo", value: (r) => r.title },
      { label: "Empresa", value: (r) => r.company },
      { label: "Sector", value: (r) => r.sector ?? "" },
      { label: "Status", value: (r) => (r.status === "open" ? "Activa" : "Inactiva") },
      { label: "Tipo Contrato", value: (r) => r.tipo_contrato ?? "" },
      { label: "Sueldo", value: (r) => (r.sueldo_aproximado_bruto_anual != null ? String(r.sueldo_aproximado_bruto_anual) : "") },
    ];
    exportToCsv("vacantes.csv", cols, rows);
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Vacantes</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Buscar por puesto, empresa, sector, contrato o sueldo"
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
          <TextField
            select
            size="small"
            label="Status"
            value={st}
            onChange={(e) => setSt(e.target.value as any)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="open">Activas</MenuItem>
            <MenuItem value="closed">Inactivas</MenuItem>
          </TextField>
          <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={onExport}>
            Exportar CSV
          </Button>
          <Button variant="contained" size="small" onClick={openCreateVacancy}>
            Nueva vacante
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

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Puesto del trabajo</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tipo Contrato</TableCell>
              <TableCell>Sueldo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              pagedRows.map((v) => (
                <TableRow
                  key={v.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/vacancies/${v.id}`, { state: { from: "/vacancies" } })}
                >
                  <TableCell>{v.title}</TableCell>
                  <TableCell>{v.company}</TableCell>
                  <TableCell>{v.sector ?? "-"}</TableCell>
                  <TableCell>{statusChip(v.status)}</TableCell>
                  <TableCell>{v.tipo_contrato ?? "-"}</TableCell>
                  <TableCell>{salaryText(v.sueldo_aproximado_bruto_anual)}</TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay vacantes que coincidan con el filtro
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

      <Dialog open={vacancyDialogOpen} onClose={() => setVacancyDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Nueva vacante</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Puesto de trabajo"
              size="small"
              fullWidth
              value={vacancyForm.title}
              onChange={(e) => setVacancyForm((f) => ({ ...f, title: e.target.value }))}
            />

            <TextField
              label="Nombre comercial de empresa"
              select
              size="small"
              fullWidth
              value={vacancyForm.company_name}
              onChange={(e) =>
                setVacancyForm((f) => ({
                  ...f,
                  company_name: e.target.value,
                  company_fiscal_name: "",
                  company_id: "",
                  sector: "",
                  practice_center_sector: "",
                  practice_center_id: "",
                  workplace: "",
                }))
              }
            >
              <MenuItem value="">
                <em>Seleccione una opción</em>
              </MenuItem>
              {companyNameOptions.map((nameOption) => (
                <MenuItem key={nameOption} value={nameOption}>
                  {nameOption}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Nombre fiscal de empresa"
              select
              size="small"
              fullWidth
              disabled={!vacancyForm.company_name}
              value={vacancyForm.company_fiscal_name}
              onChange={(e) => {
                const nextFiscalName = e.target.value;
                const matchedCompany = companiesForSelectedName.find(
                  (c) => (c.fiscal_name ?? "").trim() === nextFiscalName
                );
                setVacancyForm((f) => ({
                  ...f,
                  company_fiscal_name: nextFiscalName,
                  company_id: matchedCompany ? String(matchedCompany.id) : "",
                  sector: matchedCompany?.sector_name ?? matchedCompany?.sector ?? "",
                  practice_center_sector: "",
                  practice_center_id: "",
                  workplace: "",
                }));
              }}
              helperText={
                !vacancyForm.company_name
                  ? "Selecciona primero el nombre comercial."
                  : "Selecciona el nombre fiscal asociado al nombre comercial."
              }
            >
              <MenuItem value="">
                <em>Seleccione una opción</em>
              </MenuItem>
              {fiscalNameOptions.map((fiscalNameOption) => (
                <MenuItem key={fiscalNameOption} value={fiscalNameOption}>
                  {fiscalNameOption}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Sector"
                size="small"
                fullWidth
                value={vacancyForm.sector}
                onChange={(e) => setVacancyForm((f) => ({ ...f, sector: e.target.value }))}
              />
              <TextField
                label="Status"
                select
                size="small"
                fullWidth
                value={vacancyForm.status}
                onChange={(e) => setVacancyForm((f) => ({ ...f, status: e.target.value as Vacancy["status"] }))}
              >
                <MenuItem value="open">Activa</MenuItem>
                <MenuItem value="closed">Inactiva</MenuItem>
              </TextField>
            </Stack>

            {selectedCompanyId && vacancyCompanyCentersLoading && (
              <TextField
                label="Dirección de Centro de Prácticas"
                size="small"
                fullWidth
                value=""
                placeholder="Cargando direcciones..."
                InputProps={{ readOnly: true }}
              />
            )}

            {selectedCompanyId &&
              !vacancyCompanyCentersLoading &&
              vacancyCompanyCenters.length > 0 &&
              selectedCompanyHasComplexLayout && (
                <Stack spacing={2}>
                  <Autocomplete
                    options={practiceCenterSectorOptions}
                    value={vacancyForm.practice_center_sector || null}
                    onChange={(_, value) =>
                      setVacancyForm((f) => ({
                        ...f,
                        practice_center_sector: value ?? "",
                        practice_center_id: "",
                        workplace: "",
                      }))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Sector (si aplica)" size="small" fullWidth />
                    )}
                  />
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                      select
                      label="Centro de prácticas (si aplica)"
                      size="small"
                      fullWidth
                      disabled={!vacancyForm.practice_center_sector}
                      value={vacancyForm.practice_center_id}
                      onChange={(e) => {
                        const centerId = e.target.value;
                        const selectedCenter = practiceCenterOptionsForSelectedSector.find(
                          (pc) => String(pc.id) === centerId
                        );
                        setVacancyForm((f) => ({
                          ...f,
                          practice_center_id: centerId,
                          workplace: selectedCenter?.address ?? "",
                        }));
                      }}
                    >
                      <MenuItem value="">
                        <em>Seleccione una opción</em>
                      </MenuItem>
                      {practiceCenterOptionsForSelectedSector.map((pc) => (
                        <MenuItem key={pc.id} value={String(pc.id)}>
                          {pc.center}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Dirección de Centro de Prácticas"
                      size="small"
                      fullWidth
                      value={vacancyForm.workplace}
                      InputProps={{ readOnly: true }}
                    />
                  </Stack>
                </Stack>
              )}

            {selectedCompanyId &&
              !vacancyCompanyCentersLoading &&
              vacancyCompanyCenters.length > 0 &&
              !selectedCompanyHasComplexLayout && (
                <TextField
                  select
                  label="Dirección de Centro de Prácticas"
                  size="small"
                  fullWidth
                  value={vacancyForm.practice_center_id}
                  onChange={(e) => {
                    const centerId = e.target.value;
                    const selectedCenter = practiceCenterAddressOptions.find(
                      (pc) => String(pc.id) === centerId
                    );
                    setVacancyForm((f) => ({
                      ...f,
                      practice_center_id: centerId,
                      workplace: selectedCenter?.address ?? "",
                    }));
                  }}
                >
                  <MenuItem value="">
                    <em>Seleccione una opción</em>
                  </MenuItem>
                  {practiceCenterAddressOptions.map((pc) => (
                    <MenuItem key={pc.id} value={String(pc.id)}>
                      {pc.address}
                    </MenuItem>
                  ))}
                </TextField>
              )}

            {selectedCompanyId &&
              !vacancyCompanyCentersLoading &&
              vacancyCompanyCenters.length === 0 && (
                <TextField
                  label="Dirección de Centro de Prácticas"
                  size="small"
                  fullWidth
                  value={vacancyForm.workplace}
                  onChange={(e) => setVacancyForm((f) => ({ ...f, workplace: e.target.value }))}
                />
              )}

            <TextField
              label="Características"
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

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Horarios"
                size="small"
                fullWidth
                value={vacancyForm.horarios}
                onChange={(e) => setVacancyForm((f) => ({ ...f, horarios: e.target.value }))}
              />
              <TextField
                label="Tipo Contrato"
                size="small"
                fullWidth
                value={vacancyForm.tipo_contrato}
                onChange={(e) => setVacancyForm((f) => ({ ...f, tipo_contrato: e.target.value }))}
              />
              <TextField
                label="Sueldo Aproximado (Bruto Anual)"
                type="number"
                size="small"
                fullWidth
                value={vacancyForm.sueldo_aproximado_bruto_anual}
                onChange={(e) =>
                  setVacancyForm((f) => ({ ...f, sueldo_aproximado_bruto_anual: e.target.value }))
                }
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVacancyDialogOpen(false)} disabled={vacancySaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveVacancy}
            disabled={vacancySaving || !vacancyForm.title.trim() || !vacancyForm.company_id}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
