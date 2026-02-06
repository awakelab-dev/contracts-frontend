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
import { formatDateDMY } from "../utils/date";

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
  sent_at?: string;
};

type InterviewRow = {
  id: number;
  interview_date?: string;
  status?: "sent" | "attended" | "no_show" | null;
};

type PnlRow = {
  id: number;
  start_date?: string;
};

type HiringContractRow = {
  id: number;
  start_date?: string;
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

function lastNMonthKeys(n: number, ref: Date = new Date()): string[] {
  // Usamos meses en horario local para que el dashboard coincida con la percepción del usuario.
  const base = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const out: string[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
  }

  return out;
}

function monthLabelFromKey(key: string): string {
  const [yy, mm] = key.split("-");
  const m = Number(mm);
  const label = MONTHS_ES[m - 1] || key;
  return `${label} ${String(yy).slice(-2)}`;
}

function monthKeyFromValue(v: unknown): string | null {
  const s = String(v ?? "");
  if (s.length < 7) return null;
  const key = s.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

function countByMonth<T>(monthKeys: string[], items: T[], getDate: (item: T) => unknown): number[] {
  const map = new Map<string, number>();
  monthKeys.forEach((k) => map.set(k, 0));

  for (const it of items) {
    const key = monthKeyFromValue(getDate(it));
    if (!key) continue;
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }

  return monthKeys.map((k) => map.get(k) || 0);
}

function niceCeil(n: number) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return 1;
  if (v <= 10) return Math.ceil(v);

  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const niceF = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return niceF * exp;
}

type AreaSeries = { name: string; values: number[]; color: string };

function AreaLineChart({ labels, series, height = 220 }: { labels: string[]; series: AreaSeries[]; height?: number }) {
  const W = 720;
  const H = 260;
  const padding = { l: 44, r: 14, t: 16, b: 34 };

  const n = labels.length;
  const plotW = W - padding.l - padding.r;
  const plotH = H - padding.t - padding.b;
  const baseY = padding.t + plotH;

  const maxVal = Math.max(
    0,
    ...series.flatMap((s) => s.values.map((v) => (Number.isFinite(v) ? v : 0)))
  );
  const yMax = niceCeil(maxVal * 1.1);

  const xs = labels.map((_, i) => {
    if (n <= 1) return padding.l + plotW / 2;
    return padding.l + (plotW * i) / (n - 1);
  });

  const y = (v: number) => padding.t + plotH * (1 - Math.max(0, v) / (yMax || 1));

  const ticks = [0, Math.round(yMax / 3), Math.round((2 * yMax) / 3), yMax].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Box sx={{ width: "100%", height }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="img">
        {/* horizontal grid */}
        {ticks.map((tv) => {
          const yy = y(tv);
          return (
            <g key={tv}>
              <line x1={padding.l} x2={W - padding.r} y1={yy} y2={yy} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
              <text x={padding.l - 10} y={yy + 4} textAnchor="end" fontSize={11} fill="rgba(0,0,0,0.55)">
                {tv}
              </text>
            </g>
          );
        })}

        {/* x axis labels */}
        {labels.map((lbl, i) => (
          <text
            key={lbl + i}
            x={xs[i]}
            y={H - 12}
            textAnchor="middle"
            fontSize={11}
            fill="rgba(0,0,0,0.55)"
          >
            {lbl}
          </text>
        ))}

        {/* series (areas then lines) */}
        {series.map((s) => {
          const pts = s.values.map((v, i) => [xs[i], y(Number(v) || 0)] as const);
          if (!pts.length) return null;

          const lineD = pts
            .map(([px, py], i) => `${i === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`)
            .join(" ");

          const areaD = `${lineD} L ${pts[pts.length - 1][0].toFixed(2)} ${baseY.toFixed(2)} L ${pts[0][0].toFixed(2)} ${baseY.toFixed(
            2
          )} Z`;

          return (
            <g key={s.name}>
              <path d={areaD} fill={s.color} fillOpacity={0.12} />
              <path d={lineD} fill="none" stroke={s.color} strokeWidth={2} />
              {pts.map(([px, py], idx) => (
                <circle key={idx} cx={px} cy={py} r={3} fill={s.color} stroke="#fff" strokeWidth={1} />
              ))}
            </g>
          );
        })}

        {/* axis lines */}
        <line x1={padding.l} x2={padding.l} y1={padding.t} y2={baseY} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
        <line x1={padding.l} x2={W - padding.r} y1={baseY} y2={baseY} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      </svg>
    </Box>
  );
}

function SeriesLegend({ series }: { series: AreaSeries[] }) {
  return (
    <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
      {series.map((s) => (
        <Stack key={s.name} direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 10, height: 10, borderRadius: 99, bgcolor: s.color }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {s.name}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
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
  const [pnlRows, setPnlRows] = useState<PnlRow[]>([]);
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

        const [sumRes, sRes, cRes, vRes, invRes, intRes, pnlRes, hcRes, lRes] = await Promise.all([
          api.get<StatsSummary>("/stats/summary"),
          api.get<Student[]>("/students"),
          api.get<Company[]>("/companies"),
          api.get<(Vacancy & { company_name?: string })[]>("/vacancies"),
          api.get<InvitationRow[]>("/invitations"),
          api.get<InterviewRow[]>("/interviews"),
          api.get<PnlRow[]>("/pnl"),
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
        setPnlRows(Array.isArray(pnlRes.data) ? pnlRes.data : []);
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

  const last6MonthKeys = useMemo(() => lastNMonthKeys(6), []);
  const last6MonthLabels = useMemo(() => last6MonthKeys.map(monthLabelFromKey), [last6MonthKeys]);

  const invitations6m = useMemo(
    () => countByMonth(last6MonthKeys, invitations, (i) => i.sent_at),
    [last6MonthKeys, invitations]
  );
  const interviews6m = useMemo(
    () => countByMonth(last6MonthKeys, interviews, (i) => i.interview_date),
    [last6MonthKeys, interviews]
  );
  const pnl6m = useMemo(() => countByMonth(last6MonthKeys, pnlRows, (p) => p.start_date), [last6MonthKeys, pnlRows]);
  const contracts6m = useMemo(
    () => countByMonth(last6MonthKeys, contracts, (c) => c.start_date),
    [last6MonthKeys, contracts]
  );

  const seriesInvInt = useMemo<AreaSeries[]>(
    () => [
      { name: "Invitaciones", values: invitations6m, color: "#1976d2" },
      { name: "Entrevistas", values: interviews6m, color: "#2e7d32" },
    ],
    [invitations6m, interviews6m]
  );

  const seriesIntPnlContr = useMemo<AreaSeries[]>(
    () => [
      { name: "Entrevistas", values: interviews6m, color: "#1976d2" },
      { name: "PnL", values: pnl6m, color: "#ed6c02" },
      { name: "Contrataciones", values: contracts6m, color: "#9c27b0" },
    ],
    [interviews6m, pnl6m, contracts6m]
  );

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
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Invitaciones y Entrevistas (últimos 6 meses)
                </Typography>
                <SeriesLegend series={seriesInvInt} />
              </Stack>
              <AreaLineChart labels={last6MonthLabels} series={seriesInvInt} height={220} />
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Entrevistas, PnL y Contrataciones (últimos 6 meses)
                </Typography>
                <SeriesLegend series={seriesIntPnlContr} />
              </Stack>
              <AreaLineChart labels={last6MonthLabels} series={seriesIntPnlContr} height={220} />
            </Stack>
          </Paper>
        </Grid>

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
                      {formatDateDMY(l.start_date)} → {formatDateDMY(l.end_date)}
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
