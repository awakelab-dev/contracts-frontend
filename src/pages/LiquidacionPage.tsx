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
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Popover,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

type LiquidationTarget = "six_months" | "one_year";
type LiquidationMode = "individual" | "pooled";

type PreviewStudent = {
  student_id: number;
  first_names: string;
  last_names: string;
  eligible_from_date?: string | null;
  opening_fte_days: number;
  added_fte_days: number;
  available_fte_days: number;
  eligible: boolean;
  jornadas_possible: number;
};

type PreviewResponse = {
  start_date: string;
  end_date: string;
  min_eligible_date?: string | null;
  target: LiquidationTarget;
  mode: LiquidationMode;
  target_fte_days: number;
  pool: {
    total_available_fte_days: number;
    total_jornadas: number;
    total_used_fte_days: number;
    total_remainder_fte_days: number;
  };
  students: PreviewStudent[];
};

type LiquidationRow = {
  id: number;
  start_date: string;
  end_date: string;
  target: LiquidationTarget;
  mode: LiquidationMode;
  target_fte_days: number;
  total_students: number;
  total_fte_days_used: number;
  total_jornadas: number;
  created_at: string;
};

type LiquidationLine = {
  id: number;
  student_id: number;
  first_names: string;
  last_names: string;
  opening_fte_days: number;
  added_fte_days: number;
  used_fte_days: number;
  closing_fte_days: number;
  jornadas_generated: number;
};

type LiquidationDetails = {
  liquidation: LiquidationRow;
  lines: LiquidationLine[];
};

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function fmtDateEs(v: unknown): string {
  const iso = fmtDate(v);
  if (!iso) return "-";
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function normalizeUserDateToIso(input: string): string | null {
  const raw = (input ?? "").toString().trim();
  if (!raw) return "";

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10) === raw ? raw : null;
  }

  // DD/MM/YYYY
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (!m) {
    // DD-MM-YYYY
    m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(raw);
  }

  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
    const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const d = new Date(iso + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10) === iso ? iso : null;
  }

  return null;
}

function targetLabel(t: LiquidationTarget) {
  return t === "one_year" ? "1 año" : "6 meses";
}

function modeLabel(m: LiquidationMode) {
  return m === "pooled" ? "Combinada" : "Individual";
}

export default function LiquidacionPage() {
  const todayIso = useMemo(() => fmtDate(new Date()), []);
  const todayUi = useMemo(() => fmtDateEs(todayIso), [todayIso]);

  const [tab, setTab] = useState<"new" | "history">("new");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(todayIso);

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState(todayUi);

  const [startPickerAnchor, setStartPickerAnchor] = useState<HTMLElement | null>(null);
  const [endPickerAnchor, setEndPickerAnchor] = useState<HTMLElement | null>(null);
  const [target, setTarget] = useState<LiquidationTarget>("six_months");
  const [mode, setMode] = useState<LiquidationMode>("individual");

  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [history, setHistory] = useState<LiquidationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [executeLoading, setExecuteLoading] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<LiquidationDetails | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<LiquidationDetails | null>(null);

  async function loadHistory() {
    try {
      setHistoryError(null);
      setHistoryLoading(true);
      const { data } = await api.get<LiquidationRow[]>("/liquidations");
      setHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setHistoryError(e?.response?.data?.error || e?.message || "Error al cargar histórico");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadPreview() {
    try {
      setPreviewError(null);
      setPreviewLoading(true);
      const params: any = { end_date: endDate, target, mode };
      if (startDate) params.start_date = startDate;
      const { data } = await api.get<PreviewResponse>("/liquidations/preview", { params });
      setPreview(data);

      // El backend ajusta el "Desde" efectivo (según último cierre / fecha elegible mínima).
      // Sincronizamos para evitar confusiones.
      if (data?.start_date && (!startDate || startDate < data.start_date)) {
        setStartDate(data.start_date);
        setStartDateInput(fmtDateEs(data.start_date));
      }

      if (data?.end_date && (!endDate || endDate !== data.end_date)) {
        setEndDate(data.end_date);
        setEndDateInput(fmtDateEs(data.end_date));
      }
    } catch (e: any) {
      setPreviewError(e?.response?.data?.error || e?.message || "Error al generar previsualización");
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function openDetails(liquidationId: number) {
    try {
      setDetailsLoading(true);
      setDetails(null);
      setDetailsOpen(true);
      const { data } = await api.get<LiquidationDetails>(`/liquidations/${liquidationId}`);
      setDetails(data);
    } catch (e: any) {
      setDetails(null);
      setHistoryError(e?.response?.data?.error || e?.message || "Error al cargar detalle");
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function executeLiquidation() {
    try {
      setExecuteError(null);
      setExecuteResult(null);
      setExecuteLoading(true);

      const payload: any = { end_date: endDate, target, mode };
      if (startDate) payload.start_date = startDate;

      const { data } = await api.post<LiquidationDetails>("/liquidations", payload);
      setExecuteResult(data);

      await Promise.all([loadHistory(), loadPreview()]);
    } catch (e: any) {
      setExecuteError(e?.response?.data?.error || e?.message || "Error al ejecutar liquidación");
    } finally {
      setExecuteLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);


  useEffect(() => {
    void loadPreview();
  }, [startDate, endDate, target, mode]);

  const eligibleCount = useMemo(() => {
    return (preview?.students || []).filter((s) => s.eligible).length;
  }, [preview]);

  const startInputParsed = useMemo(() => normalizeUserDateToIso(startDateInput), [startDateInput]);
  const startInputError = startDateInput.trim() !== "" && startInputParsed === null;

  const endInputParsed = useMemo(() => normalizeUserDateToIso(endDateInput), [endDateInput]);
  const endInputError = endDateInput.trim() !== "" && endInputParsed === null;

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" mb={2}>
        <Typography variant="h5">Liquidación</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />}>
            Generar PDF
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={executeLiquidation}
            disabled={
              executeLoading ||
              previewLoading ||
              !preview ||
              preview.students.length === 0 ||
              (preview.pool?.total_jornadas ?? 0) < 1
            }
          >
            Ejecutar liquidación
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="new" label="Nueva liquidación" />
          <Tab value="history" label={`Histórico (${history.length})`} />
        </Tabs>

        <Divider sx={{ mt: 1.5, mb: 2 }} />

        {tab === "new" ? (
          <Stack spacing={2}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Desde"
                  size="small"
                  fullWidth
                  value={startDateInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStartDateInput(next);
                    const iso = normalizeUserDateToIso(next);
                    if (iso === "") {
                      setStartDate("");
                    } else if (iso) {
                      setStartDate(iso);
                      setStartDateInput(fmtDateEs(iso));
                    }
                  }}
                  placeholder="dd/mm/aaaa (o dd-mm-aaaa)"
                  error={startInputError}
                  helperText={startInputError ? "Formato: dd/mm/aaaa o dd-mm-aaaa" : undefined}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={(e) => setStartPickerAnchor(e.currentTarget)}>
                          <CalendarMonthIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Popover
                  open={Boolean(startPickerAnchor)}
                  anchorEl={startPickerAnchor}
                  onClose={() => setStartPickerAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                  <Box sx={{ p: 2, width: 260 }}>
                    <TextField
                      label="Desde"
                      type="date"
                      size="small"
                      fullWidth
                      value={startDate || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStartDate(v);
                        setStartDateInput(fmtDateEs(v));
                        setStartPickerAnchor(null);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Popover>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  label="Hasta"
                  size="small"
                  fullWidth
                  value={endDateInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEndDateInput(next);
                    const iso = normalizeUserDateToIso(next);
                    if (iso && iso !== "") {
                      setEndDate(iso);
                      setEndDateInput(fmtDateEs(iso));
                    }
                  }}
                  placeholder="dd/mm/aaaa (o dd-mm-aaaa)"
                  error={endInputError}
                  helperText={endInputError ? "Formato: dd/mm/aaaa o dd-mm-aaaa" : undefined}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={(e) => setEndPickerAnchor(e.currentTarget)}>
                          <CalendarMonthIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Popover
                  open={Boolean(endPickerAnchor)}
                  anchorEl={endPickerAnchor}
                  onClose={() => setEndPickerAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                >
                  <Box sx={{ p: 2, width: 260 }}>
                    <TextField
                      label="Hasta"
                      type="date"
                      size="small"
                      fullWidth
                      value={endDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEndDate(v);
                        setEndDateInput(fmtDateEs(v));
                        setEndPickerAnchor(null);
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                </Popover>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  label="Objetivo"
                  size="small"
                  fullWidth
                  value={target}
                  onChange={(e) => setTarget(e.target.value as LiquidationTarget)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="six_months">6 meses</MenuItem>
                  <MenuItem value="one_year">1 año</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  label="Modo"
                  size="small"
                  fullWidth
                  value={mode}
                  onChange={(e) => setMode(e.target.value as LiquidationMode)}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="individual">Individual</MenuItem>
                  <MenuItem value="pooled">Combinada</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`Elegibles: ${eligibleCount}`} size="small" color={eligibleCount ? "success" : "default"} />
                    <Chip
                      label={`Objetivo: ${preview?.target_fte_days ?? (target === "one_year" ? 260 : 130)} días (jornada completa)`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadPreview} disabled={previewLoading}>
                    Actualizar
                  </Button>
                </Stack>
              </Grid>
            </Grid>

            {(history.length > 0 || preview?.start_date) && (
              <Typography variant="caption" color="text.secondary">
                Periodo efectivo: {fmtDateEs(preview?.start_date || startDate)} → {fmtDateEs(preview?.end_date || endDate)}. (El sistema ajusta el inicio según el último cierre y la fecha elegible mínima)
              </Typography>
            )}

            {preview && (preview.pool?.total_jornadas ?? 0) < 1 && !previewLoading && (
              <Alert severity="warning">
                Aún no alcanza para liquidar al menos <strong>1 jornada completa</strong> con el objetivo seleccionado.
              </Alert>
            )}

            {previewError && (
              <Alert severity="error" onClose={() => setPreviewError(null)}>
                {previewError}
              </Alert>
            )}

            {preview && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Resumen (previsualización)
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Días disponibles (total)
                    </Typography>
                    <Typography variant="h6">{preview.pool.total_available_fte_days.toFixed(2)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Jornadas posibles ({targetLabel(target)})
                    </Typography>
                    <Typography variant="h6">{preview.pool.total_jornadas}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Días a liquidar
                    </Typography>
                    <Typography variant="h6">{preview.pool.total_used_fte_days.toFixed(2)}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Remanente
                    </Typography>
                    <Typography variant="h6">{preview.pool.total_remainder_fte_days.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Modo actual: {modeLabel(mode)}. En modo Individual, las jornadas se calculan por alumno; en modo Combinada,
                  se suman los días de todos los alumnos para completar jornadas.
                </Typography>
              </Paper>
            )}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Alumno</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha elegible</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Saldo anterior
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Días periodo
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Jornadas posibles
                    </TableCell>
                    <TableCell align="right">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(preview?.students || []).map((s) => (
                    <TableRow key={s.student_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {`${s.first_names} ${s.last_names}`.trim() || `ID #${s.student_id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Nº expediente: {s.student_id}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateEs(s.eligible_from_date)}</TableCell>
                      <TableCell align="right">{s.opening_fte_days.toFixed(2)}</TableCell>
                      <TableCell align="right">{s.added_fte_days.toFixed(2)}</TableCell>
                      <TableCell align="right">{s.available_fte_days.toFixed(2)}</TableCell>
                      <TableCell align="right">{s.jornadas_possible}</TableCell>
                      <TableCell align="right">
                        {s.eligible ? (
                          <Chip size="small" label="Elegible" color="success" />
                        ) : (
                          <Chip size="small" label="Pendiente" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {preview && preview.students.length === 0 && !previewLoading && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay alumnos con días cotizados para el rango seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {executeError && (
              <Alert severity="error" onClose={() => setExecuteError(null)}>
                {executeError}
              </Alert>
            )}

            {executeResult && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Resultado de la liquidación #{executeResult.liquidation.id}
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Rango
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {fmtDateEs(executeResult.liquidation.start_date)} → {fmtDateEs(executeResult.liquidation.end_date)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Jornadas cotizadas
                    </Typography>
                    <Typography variant="h6">{executeResult.liquidation.total_jornadas}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Alumnos utilizados
                    </Typography>
                    <Typography variant="h6">{executeResult.liquidation.total_students}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                      Días liquidado (total)
                    </Typography>
                    <Typography variant="h6">{Number(executeResult.liquidation.total_fte_days_used).toFixed(2)}</Typography>
                  </Grid>
                </Grid>

                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Alumno</TableCell>
                        <TableCell align="right">Saldo ant.</TableCell>
                        <TableCell align="right">Periodo</TableCell>
                        <TableCell align="right">Liquidado</TableCell>
                        <TableCell align="right">Remanente</TableCell>
                        <TableCell align="right">Jornadas</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {executeResult.lines.map((l) => (
                        <TableRow key={l.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {`${l.first_names} ${l.last_names}`.trim() || `ID #${l.student_id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Nº expediente: {l.student_id}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{Number(l.opening_fte_days).toFixed(2)}</TableCell>
                          <TableCell align="right">{Number(l.added_fte_days).toFixed(2)}</TableCell>
                          <TableCell align="right">{Number(l.used_fte_days).toFixed(2)}</TableCell>
                          <TableCell align="right">{Number(l.closing_fte_days).toFixed(2)}</TableCell>
                          <TableCell align="right">{l.jornadas_generated}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Paper>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {historyError && (
              <Alert severity="error" onClose={() => setHistoryError(null)}>
                {historyError}
              </Alert>
            )}

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadHistory} disabled={historyLoading}>
                Actualizar
              </Button>
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Rango</TableCell>
                    <TableCell>Objetivo</TableCell>
                    <TableCell>Modo</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Jornadas
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Alumnos
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      Días liquidado
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Creado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} hover sx={{ cursor: "pointer" }} onClick={() => openDetails(h.id)}>
                      <TableCell>{h.id}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {fmtDateEs(h.start_date)} → {fmtDateEs(h.end_date)}
                      </TableCell>
                      <TableCell>{targetLabel(h.target)}</TableCell>
                      <TableCell>{modeLabel(h.mode)}</TableCell>
                      <TableCell align="right">{h.total_jornadas}</TableCell>
                      <TableCell align="right">{h.total_students}</TableCell>
                      <TableCell align="right">{Number(h.total_fte_days_used).toFixed(2)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateEs(h.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && !historyLoading && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay liquidaciones registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            <Typography variant="caption" color="text.secondary">
              Consejo: para evitar duplicar días, intenta que cada liquidación use un rango de fechas nuevo.
            </Typography>
          </Stack>
        )}
      </Paper>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Detalle de liquidación</DialogTitle>
        <DialogContent dividers>
          {detailsLoading ? (
            <Typography color="text.secondary">Cargando…</Typography>
          ) : details ? (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Rango
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {fmtDateEs(details.liquidation.start_date)} → {fmtDateEs(details.liquidation.end_date)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Objetivo / modo
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {targetLabel(details.liquidation.target)} · {modeLabel(details.liquidation.mode)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" color="text.secondary">
                      Jornadas / alumnos
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {details.liquidation.total_jornadas} jornadas · {details.liquidation.total_students} alumnos
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Alumno</TableCell>
                      <TableCell align="right">Saldo ant.</TableCell>
                      <TableCell align="right">Periodo</TableCell>
                      <TableCell align="right">Liquidado</TableCell>
                      <TableCell align="right">Remanente</TableCell>
                      <TableCell align="right">Jornadas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.lines.map((l) => (
                      <TableRow key={l.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {`${l.first_names} ${l.last_names}`.trim() || `ID #${l.student_id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nº expediente: {l.student_id}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{Number(l.opening_fte_days).toFixed(2)}</TableCell>
                        <TableCell align="right">{Number(l.added_fte_days).toFixed(2)}</TableCell>
                        <TableCell align="right">{Number(l.used_fte_days).toFixed(2)}</TableCell>
                        <TableCell align="right">{Number(l.closing_fte_days).toFixed(2)}</TableCell>
                        <TableCell align="right">{l.jornadas_generated}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Stack>
          ) : (
            <Typography color="text.secondary">Sin datos.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
