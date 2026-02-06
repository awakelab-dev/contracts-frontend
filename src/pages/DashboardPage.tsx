import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import api from "../lib/api";
import { useEffect, useMemo, useState } from "react";
import type { Company, Student, Vacancy } from "../types";
import SchoolIcon from "@mui/icons-material/School";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import InsightsIcon from "@mui/icons-material/Insights";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

type StatsSummary = {
  total_students: number;
  employed_or_improved: number;
  currently_employed: number;
  missing_cvs: number;
  open_vacancies?: number;
  employed_rate?: number;
};

type InvitationRow = {
  id: number;
  status: "sent" | "accepted" | "rejected" | "expired";
};

type InterviewRow = {
  id: number;
  status?: "sent" | "attended" | "no_show" | null;
};

type HiringContractRow = {
  id: number;
  company_name: string;
  sector?: string | null;
  contributed_days?: number | null;
};

type LiquidationRow = {
  id: number;
  start_date: string;
  end_date: string;
  target: "six_months" | "one_year";
  mode: "individual" | "pooled";
  total_students: number;
  total_fte_days_used: number;
  total_jornadas: number;
  created_at: string;
};

type LiquidationPreview = {
  pool: {
    total_available_fte_days: number;
    total_jornadas: number;
    total_used_fte_days: number;
    total_remainder_fte_days: number;
  };
};

type DonutSlice = { label: string; value: number; color: string };

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function DonutChart({ slices, size = 88, thickness = 14 }: { slices: DonutSlice[]; size?: number; thickness?: number }) {
  const total = slices.reduce((acc, s) => acc + (Number.isFinite(s.value) ? s.value : 0), 0);

  if (total <= 0) {
    return (
      <Box sx={{ position: "relative", width: size, height: size }}>
        <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: "divider" }} />
        <Box
          sx={{
            position: "absolute",
            inset: thickness,
            borderRadius: "50%",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            0
          </Typography>
        </Box>
      </Box>
    );
  }

  let acc = 0;
  const segments = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    });

  const background = `conic-gradient(${segments.join(", ")})`;

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <Box sx={{ width: size, height: size, borderRadius: "50%", background }} />
      <Box
        sx={{
          position: "absolute",
          inset: thickness,
          borderRadius: "50%",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
          {total}
        </Typography>
      </Box>
    </Box>
  );
}

function DonutCard({ title, slices }: { title: string; slices: DonutSlice[] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <DonutChart slices={slices} size={90} thickness={14} />
        <Stack spacing={0.4} sx={{ flex: 1 }}>
          {slices.map((s) => (
            <Stack key={s.label} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: 99, bgcolor: s.color }} />
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {s.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function KpiCard({
  title,
  value,
  icon,
  caption,
  color,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  caption?: string;
  color?: "primary" | "success" | "warning" | "info";
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        <Box sx={{ color: (t) => (color ? t.palette[color].main : t.palette.text.secondary) }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Stack>
      <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      ) : null}
    </Paper>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<(Vacancy & { company_name?: string })[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [contracts, setContracts] = useState<HiringContractRow[]>([]);
  const [liquidations, setLiquidations] = useState<LiquidationRow[]>([]);
  const [liqPreview, setLiqPreview] = useState<LiquidationPreview | null>(null);

  useEffect(() => {
    let cancel = false;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const end_date = fmtDate(new Date());

        const [sumRes, sRes, cRes, vRes, invRes, intRes, hcRes, lRes] = await Promise.all([
          api.get<StatsSummary>("/stats/summary"),
          api.get<Student[]>("/students"),
          api.get<Company[]>("/companies"),
          api.get<(Vacancy & { company_name?: string })[]>("/vacancies"),
          api.get<InvitationRow[]>("/invitations"),
          api.get<InterviewRow[]>("/interviews"),
          api.get<HiringContractRow[]>("/hiring-contracts"),
          api.get<LiquidationRow[]>("/liquidations"),
        ]);

        // Preview de liquidación: útil para saber si ya se puede cerrar 6 meses.
        let preview: LiquidationPreview | null = null;
        try {
          const { data } = await api.get<LiquidationPreview>("/liquidations/preview", {
            params: { end_date, target: "six_months", mode: "pooled" },
          });
          preview = data;
        } catch {
          preview = null;
        }

        if (cancel) return;
        setSummary(sumRes.data);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setInvitations(Array.isArray(invRes.data) ? invRes.data : []);
        setInterviews(Array.isArray(intRes.data) ? intRes.data : []);
        setContracts(Array.isArray(hcRes.data) ? hcRes.data : []);
        setLiquidations(Array.isArray(lRes.data) ? lRes.data : []);
        setLiqPreview(preview);
      } catch (e: any) {
        if (cancel) return;
        setError(e?.response?.data?.error || e?.message || "Error al cargar dashboard");
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    void run();
    return () => {
      cancel = true;
    };
  }, []);

  const employmentCounts = useMemo(() => {
    const c = { unemployed: 0, employed: 0, improved: 0, unknown: 0 };
    students.forEach((s) => {
      const v = (s.employment_status || "unknown").toString().toLowerCase();
      if (v === "unemployed") c.unemployed += 1;
      else if (v === "employed") c.employed += 1;
      else if (v === "improved") c.improved += 1;
      else c.unknown += 1;
    });
    return c;
  }, [students]);

  const invCounts = useMemo(() => {
    const c = { sent: 0, accepted: 0, rejected: 0, expired: 0 };
    invitations.forEach((i) => {
      const v = (i.status || "sent").toString().toLowerCase();
      if (v === "accepted") c.accepted += 1;
      else if (v === "rejected") c.rejected += 1;
      else if (v === "expired") c.expired += 1;
      else c.sent += 1;
    });
    return c;
  }, [invitations]);

  const interviewCounts = useMemo(() => {
    const c = { sent: 0, attended: 0, no_show: 0 };
    interviews.forEach((i) => {
      const v = (i.status || "sent").toString().toLowerCase();
      if (v === "attended") c.attended += 1;
      else if (v === "no_show") c.no_show += 1;
      else c.sent += 1;
    });
    return c;
  }, [interviews]);

  const vacancyCounts = useMemo(() => {
    const c = { open: 0, closed: 0 };
    vacancies.forEach((v) => {
      if ((v.status || "open") === "closed") c.closed += 1;
      else c.open += 1;
    });
    return c;
  }, [vacancies]);

  const topCompaniesByContracts = useMemo(() => {
    const m = new Map<string, number>();
    contracts.forEach((c) => {
      const key = (c.company_name || "-").toString();
      m.set(key, (m.get(key) || 0) + 1);
    });
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [contracts]);

  const recentLiquidations = useMemo(() => liquidations.slice(0, 5), [liquidations]);

  const liqJornadasNow = liqPreview?.pool?.total_jornadas ?? 0;

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" mb={2}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Inicio
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to="/liquidacion" variant="contained" startIcon={<ReceiptLongIcon />}>
            Liquidación
          </Button>
          <Button component={RouterLink} to="/reports" variant="outlined" startIcon={<InsightsIcon />}>
            Informes
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Alumnos" value={summary?.total_students ?? students.length} icon={<SchoolIcon />} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Empresas" value={companies.length} icon={<BusinessIcon />} color="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard title="Vacantes abiertas" value={vacancyCounts.open} icon={<WorkIcon />} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Jornadas (6 meses) disponibles"
            value={liqJornadasNow}
            icon={<ReceiptLongIcon />}
            color={liqJornadasNow ? "success" : "warning"}
            caption={liqPreview ? `Remanente: ${liqPreview.pool.total_remainder_fte_days.toFixed(2)} días` : "(sin datos)"}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DonutCard
            title="Estado laboral (alumnos)"
            slices={[
              { label: "Desempleado", value: employmentCounts.unemployed, color: "#1976d2" },
              { label: "Empleado", value: employmentCounts.employed, color: "#2e7d32" },
              { label: "Mejor opción", value: employmentCounts.improved, color: "#ed6c02" },
              { label: "Desconocido", value: employmentCounts.unknown, color: "#9e9e9e" },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DonutCard
            title="Vacantes (estado)"
            slices={[
              { label: "Abiertas", value: vacancyCounts.open, color: "#2e7d32" },
              { label: "Cerradas", value: vacancyCounts.closed, color: "#9e9e9e" },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DonutCard
            title="Invitaciones (estado)"
            slices={[
              { label: "Enviadas", value: invCounts.sent, color: "#1976d2" },
              { label: "Aceptadas", value: invCounts.accepted, color: "#2e7d32" },
              { label: "Rechazadas", value: invCounts.rejected, color: "#ed6c02" },
              { label: "Expiradas", value: invCounts.expired, color: "#9e9e9e" },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DonutCard
            title="Entrevistas (estado)"
            slices={[
              { label: "Enviadas", value: interviewCounts.sent, color: "#1976d2" },
              { label: "Asistidas", value: interviewCounts.attended, color: "#2e7d32" },
              { label: "No asistió", value: interviewCounts.no_show, color: "#ed6c02" },
            ]}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Top empresas (contrataciones)
              </Typography>
              <Button component={RouterLink} to="/students" size="small">
                Ver alumnos
              </Button>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {topCompaniesByContracts.length ? (
              <Stack spacing={1}>
                {topCompaniesByContracts.map(([name, count]) => (
                  <Stack key={name} direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 320 }}>
                      {name}
                    </Typography>
                    <Chip size="small" label={count} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Sin datos
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Últimas liquidaciones
              </Typography>
              <Button component={RouterLink} to="/liquidacion" size="small">
                Abrir
              </Button>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Rango</TableCell>
                  <TableCell>Modo</TableCell>
                  <TableCell align="right">Jornadas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentLiquidations.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>{l.id}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {fmtDate(l.start_date)} → {fmtDate(l.end_date)}
                    </TableCell>
                    <TableCell>{l.mode === "pooled" ? "Combinada" : "Individual"}</TableCell>
                    <TableCell align="right">{l.total_jornadas}</TableCell>
                  </TableRow>
                ))}
                {!recentLiquidations.length && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: "text.secondary" }}>
                      No hay liquidaciones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      {summary && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            CVs faltantes: {summary.missing_cvs} · Vacantes abiertas: {summary.open_vacancies ?? vacancyCounts.open} · Empleados/mejor opción: {summary.employed_or_improved}
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
