import {
  Alert,
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../lib/api";
import { formatDateDMY, toIsoDate } from "../utils/date";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

type ReportData = {
  alumnosAccedenPracticas: number;
  alumnosEntrevistas: number;
  alumnosIncorporados: number;
  alumnosMas6Meses: number;
  insercionLaboral: number; // %
  porcentajeEmpleoAntes3Meses: number; // %
  tiempoPromedioBusqueda: number | null; // días
  alumnosFinalizanPNL: number;
};

type ReportMeta = {
  min_date: string | null;
  max_date: string;
  min_month: string;
  max_month: string;
  min_quarter: string;
  max_quarter: string;
};

type ReportPeriod = {
  type: "monthly" | "quarterly";
  key: string;
  start_date: string;
  end_date: string;
};

type ReportResponse = {
  meta: ReportMeta;
  period: ReportPeriod;
  data: ReportData;
};

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec((key || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function monthLabel(key: string): string {
  const p = parseMonthKey(key);
  if (!p) return key;
  return `${MONTHS_ES[p.month - 1]} ${p.year}`;
}

function buildMonthKeys(minKey: string, maxKey: string): string[] {
  const min = parseMonthKey(minKey);
  const max = parseMonthKey(maxKey);
  if (!min || !max) return [];

  const out: string[] = [];
  let y = min.year;
  let m = min.month;

  while (y < max.year || (y === max.year && m <= max.month)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return out;
}

function parseQuarterKey(key: string): { year: number; quarter: number } | null {
  const m = /^(\d{4})-(?:Q|q|T|t)([1-4])$/.exec((key || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const quarter = Number(m[2]);
  if (!Number.isFinite(year) || !Number.isFinite(quarter)) return null;
  return { year, quarter };
}

function quarterLabel(key: string): string {
  const p = parseQuarterKey(key);
  if (!p) return key;
  return `T${p.quarter} ${p.year}`;
}

function buildQuarterKeys(minKey: string, maxKey: string): string[] {
  const min = parseQuarterKey(minKey);
  const max = parseQuarterKey(maxKey);
  if (!min || !max) return [];

  const out: string[] = [];
  let y = min.year;
  let q = min.quarter;

  const maxIdx = max.year * 4 + max.quarter;
  while (y * 4 + q <= maxIdx) {
    out.push(`${y}-Q${q}`);
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }

  return out;
}

function KpiCard({ label, value, loading }: { label: string; value: ReactNode; loading: boolean }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={120} height={44} />
      ) : (
        <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
          {value}
        </Typography>
      )}
    </Paper>
  );
}

function MetricRow({ label, value, help, loading }: { label: string; value: ReactNode; help?: string; loading: boolean }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between" sx={{ py: 1.25 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {label}
        </Typography>
        {help ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {help}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ minWidth: 120, textAlign: "right" }}>
        {loading ? (
          <Skeleton variant="text" width={80} height={28} sx={{ ml: "auto" }} />
        ) : (
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export default function ReportsPage() {
  const [tipoInforme, setTipoInforme] = useState<"MENSUAL" | "TRIMESTRAL">("MENSUAL");
  const reportType = tipoInforme === "TRIMESTRAL" ? "quarterly" : "monthly";

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [period, setPeriod] = useState<ReportPeriod | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatedAt = useMemo(() => formatDateDMY(new Date()), []);

  const [monthKey, setMonthKey] = useState(() => {
    const iso = toIsoDate(new Date()) || new Date().toISOString().slice(0, 10);
    return iso.slice(0, 7);
  });

  const [quarterKey, setQuarterKey] = useState(() => {
    const iso = toIsoDate(new Date()) || new Date().toISOString().slice(0, 10);
    const y = iso.slice(0, 4);
    const m = Number(iso.slice(5, 7));
    const q = Math.floor((m - 1) / 3) + 1;
    return `${y}-Q${q}`;
  });

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);

    const key = reportType === "monthly" ? monthKey : quarterKey;

    api
      .get<ReportResponse>("/stats/reports", {
        params: {
          type: reportType,
          key,
        },
      })
      .then(({ data: resData }) => {
        if (cancel) return;
        setMeta(resData.meta);
        setPeriod(resData.period);
        setData(resData.data);

        // Si el backend ajusta el periodo por validación, sincronizamos el selector.
        if (resData.period.type === "monthly" && resData.period.key !== monthKey) setMonthKey(resData.period.key);
        if (resData.period.type === "quarterly" && resData.period.key !== quarterKey) setQuarterKey(resData.period.key);
      })
      .catch((e) => {
        if (cancel) return;
        setError(e?.response?.data?.message || e?.message || "Error al cargar informes");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [reportType, monthKey, quarterKey]);

  const nfInt = useMemo(() => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }), []);
  const nfPct = useMemo(() => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }), []);

  const fmtInt = (n: number | null | undefined) => nfInt.format(Number(n ?? 0));
  const fmtPct = (n: number | null | undefined) => `${nfPct.format(Number(n ?? 0))}%`;

  const tiempoBusqueda = useMemo(() => {
    const v = data?.tiempoPromedioBusqueda;
    if (v == null) return "N/D";
    const n = Number(v);
    if (!Number.isFinite(n)) return "N/D";
    return `${nfInt.format(n)} días`;
  }, [data?.tiempoPromedioBusqueda, nfInt]);

  const monthOptions = useMemo(() => {
    if (!meta) return [] as { key: string; label: string }[];
    return buildMonthKeys(meta.min_month, meta.max_month).map((k) => ({ key: k, label: monthLabel(k) }));
  }, [meta]);

  const quarterOptions = useMemo(() => {
    if (!meta) return [] as { key: string; label: string }[];
    return buildQuarterKeys(meta.min_quarter, meta.max_quarter).map((k) => ({ key: k, label: quarterLabel(k) }));
  }, [meta]);

  const selectedPeriodTitle = useMemo(() => {
    if (!period) return "";
    return period.type === "monthly" ? monthLabel(period.key) : quarterLabel(period.key);
  }, [period]);

  const selectedPeriodRange = useMemo(() => {
    if (!period) return "";
    return `${formatDateDMY(period.start_date)} → ${formatDateDMY(period.end_date)}`;
  }, [period]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: (t) => t.palette.grey[50] }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, maxWidth: 1100, mx: "auto" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
              INFORME {tipoInforme}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Indicadores de inserción y actividad
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedPeriodTitle ? `Periodo: ${selectedPeriodTitle} · ${selectedPeriodRange}` : null}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generado el {generatedAt}
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                Tipo de informe
              </Typography>
              <ToggleButtonGroup
                value={tipoInforme}
                exclusive
                onChange={(_, value) => value && setTipoInforme(value)}
                size="small"
              >
                <ToggleButton value="MENSUAL">MENSUAL</ToggleButton>
                <ToggleButton value="TRIMESTRAL">TRIMESTRAL</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {tipoInforme === "MENSUAL" ? (
              <TextField
                select
                size="small"
                label="Mes"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
                sx={{ minWidth: 220 }}
                disabled={!meta || loading}
              >
                {monthOptions.map((o) => (
                  <MenuItem key={o.key} value={o.key}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                select
                size="small"
                label="Trimestre"
                value={quarterKey}
                onChange={(e) => setQuarterKey(e.target.value)}
                sx={{ minWidth: 180 }}
                disabled={!meta || loading}
              >
                {quarterOptions.map((o) => (
                  <MenuItem key={o.key} value={o.key}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Button
              size="small"
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              disabled
              sx={{ alignSelf: { xs: "stretch", sm: "auto" } }}
            >
              Exportar
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Divider sx={{ mb: 2 }} />

        {/* Resumen ejecutivo */}
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>
          Resumen ejecutivo
        </Typography>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label="Acceden a PnL"
              value={fmtInt(data?.alumnosAccedenPracticas)}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label="Entrevistas asistidas"
              value={fmtInt(data?.alumnosEntrevistas)}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label="Incorporaciones a empleo"
              value={fmtInt(data?.alumnosIncorporados)}
              loading={loading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard
              label="Inserción laboral"
              value={fmtPct(data?.insercionLaboral)}
              loading={loading}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          {/* Actividad */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                Actividad
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <MetricRow
                label="Número de alumnos/as que acceden a prácticas no laborales"
                value={fmtInt(data?.alumnosAccedenPracticas)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Número de alumnos/as que asisten a entrevistas de trabajo"
                value={fmtInt(data?.alumnosEntrevistas)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Número de alumnos/as que se incorporan a un puesto de trabajo"
                value={fmtInt(data?.alumnosIncorporados)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Alumnos que finalizan prácticas (PnL)"
                value={fmtInt(data?.alumnosFinalizanPNL)}
                loading={loading}
              />
            </Paper>
          </Grid>

          {/* Impacto */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
                Impacto y permanencia
              </Typography>
              <Divider sx={{ mb: 1 }} />

              <MetricRow
                label="Número de alumnos/as incorporados a empresas que superan los 6 meses de permanencia"
                value={fmtInt(data?.alumnosMas6Meses)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Indicadores de impacto en el alumnado: Inserción laboral"
                value={fmtPct(data?.insercionLaboral)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Porcentaje de alumnos que consiguen empleo en el sector antes de 3 meses"
                help="Desde la finalización del itinerario hasta el primer contrato"
                value={fmtPct(data?.porcentajeEmpleoAntes3Meses)}
                loading={loading}
              />
              <Divider />
              <MetricRow
                label="Tiempo promedio de búsqueda de empleo"
                help="Tiempo estimado desde el fin del itinerario hasta encontrar trabajo"
                value={tiempoBusqueda}
                loading={loading}
              />
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ mt: 2.5, mb: 1.5 }} />

        <Typography variant="caption" color="text.secondary">
          Nota: “N/D” indica que no hay datos suficientes para el cálculo en el periodo seleccionado.
        </Typography>
      </Paper>
    </Box>
  );
}
