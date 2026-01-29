import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  LinearProgress,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import SearchIcon from "@mui/icons-material/Search";
import api from "../lib/api";

// Esquemas por tipo de importación
const SCHEMES = {
  students: ["full_name", "dni_nie", "course_code", "employment_status"],
  companies: ["name", "sector", "email", "location"],
  vacancies: ["title", "company_name", "sector", "location"],
} as const;
type ImportType = keyof typeof SCHEMES;
type TargetField = (typeof SCHEMES)[ImportType][number];
type CsvRowObj = Record<string, string>;

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState(",");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRowObj[]>([]);
  const [query, setQuery] = useState("");
  const [importType, setImportType] = useState<ImportType>('students');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parsear con PapaParse dinámico para evitar bundle pesado si no se usa.
  async function parseWithPapa(file: File, delim: string) {
    const Papa = (await import("papaparse")).default;
    return new Promise<{ headers: string[]; rows: CsvRowObj[] }>((resolve, reject) => {
      Papa.parse<CsvRowObj>(file, {
        header: true,
        delimiter: delim,
        skipEmptyLines: true,
        transformHeader: (h) => (h || "").trim(),
        complete: (res) => {
          const data = (res.data || []).filter((r) => r && Object.keys(r).length > 0);
          const hdrs = (res.meta.fields || []).map((h) => h || "");
          resolve({ headers: hdrs, rows: data });
        },
        error: (err) => reject(err),
      });
    });
  }

  const handlePickFile = () => fileInputRef.current?.click();

  function guessMapping(hdrs: string[], type: ImportType): Record<string, string> {
    const lower = (s: string) => s.toLowerCase();
    const find = (...keys: string[]) => hdrs.find((h) => keys.some((k) => lower(h).includes(k))) || "";
    if (type === 'students') {
      return {
        full_name: find('nombre','full'),
        dni_nie: find('dni','nie','documento'),
        course_code: find('curso','course','code'),
        employment_status: find('status','empleo','situacion'),
      };
    } else if (type === 'companies') {
      return {
        name: find('name','empresa'),
        sector: find('sector','industry'),
        email: find('email','correo','mail'),
        location: find('ubic', 'loc', 'ciudad', 'provincia', 'direccion'),
      };
    } else {
      // vacancies
      return {
        title: find('title','titulo','vacante','puesto'),
        company_name: find('company','empresa'),
        sector: find('sector','industry'),
        location: find('ubic', 'loc', 'ciudad', 'provincia','direccion'),
      };
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setResult(null);
    setFileName(f.name);
    setFileObj(f);
    // parse inicial con delimitador actual
    try {
      const { headers: hdrs, rows: data } = await parseWithPapa(f, delimiter);
      setHeaders(hdrs);
      setRows(data);
      // autodefault mapping por tipo
      setMapping(guessMapping(hdrs, importType));
    } catch (err: any) {
      setError(err?.message || "Error al leer el CSV");
      setHeaders([]);
      setRows([]);
    }
  };
const handleDelimiterChange = (val: string) => {
  setDelimiter(val);
  // Limpiamos los resultados previos para forzar el re-parseo
  setHeaders([]);
  setRows([]);
};
  // Reparsear si cambia el delimitador y hay archivo cargado
  useEffect(() => {
    if (!fileObj) return;
    (async () => {
      try {
        const { headers: hdrs, rows: data } = await parseWithPapa(fileObj, delimiter);
        setHeaders(hdrs);
        setRows(data);
      } catch (err: any) {
        setError(err?.message || "Error al leer el CSV");
        setHeaders([]);
        setRows([]);
      }
    })();
  }, [delimiter]);

  // Reajustar mapping al cambiar el tipo de import
  useEffect(() => {
    if (!headers.length) return;
    setMapping(guessMapping(headers, importType));
  }, [importType, headers]);

  const visibleRows = useMemo(() => {
    const list = rows.slice(0, 5); // previsualizar 5 registros
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((r) => Object.values(r).some((v) => (v || "").toString().toLowerCase().includes(q)));
  }, [rows, query]);

  const onChangeMapping = (field: string, value: string) => {
    setMapping((m) => ({ ...m, [field]: value }));
  };

  const sanitize = (s: string) => (s || '').replace(/^\"+|\"+$/g, '').trim();

  const buildPayload = () => {
    const fields = SCHEMES[importType];
    if (importType === 'students') {
      const toValidStatus = (s: string) => {
        const v = (s || "").toLowerCase();
        return ["unemployed", "employed", "improved", "unknown"].includes(v) ? v : "unknown";
      };
      const payloadRows = rows.map((r) => ({
        full_name: sanitize((r[mapping['full_name']] || "").toString()),
        dni_nie: sanitize((r[mapping['dni_nie']] || "").toString()),
        course_code: sanitize((r[mapping['course_code']] || "").toString()),
        employment_status: toValidStatus(sanitize((r[mapping['employment_status']] || "").toString())),
      })).filter((x) => x.full_name && x.dni_nie && x.course_code);
      return { rows: payloadRows };
    }
    if (importType === 'companies') {
      const payloadRows = rows.map((r) => ({
        name: sanitize((r[mapping['name']] || "").toString()),
        sector: sanitize((r[mapping['sector']] || "").toString()),
        email: sanitize((r[mapping['email']] || "").toString()),
        location: sanitize((r[mapping['location']] || "").toString()),
      })).filter((x) => x.name);
      return { rows: payloadRows };
    }
    // vacancies
    const payloadRows = rows.map((r) => ({
      title: sanitize((r[mapping['title']] || "").toString()),
      company_name: sanitize((r[mapping['company_name']] || "").toString()),
      sector: sanitize((r[mapping['sector']] || "").toString()),
      location: sanitize((r[mapping['location']] || "").toString()),
    })).filter((x) => x.title && x.company_name);
    return { rows: payloadRows };
  };

  const handleImport = async () => {
    if (!headers.length) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const payload = buildPayload();
      const { data } = await api.post(`/${importType}/import`, payload);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Error en importación");
    } finally {
      setUploading(false);
    }
  };

  const resetAll = () => {
    setFileName("");
    setFileObj(null);
    setHeaders([]);
    setRows([]);
    setMapping({ full_name: "", dni_nie: "", course_code: "", employment_status: "" });
    setResult(null);
    setError(null);
    setQuery("");
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
        <Typography variant="h5">Importación de datos (CSV)</Typography>
        <Stack direction="row" spacing={1}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handlePickFile}>
            Seleccionar archivo
          </Button>
          <TextField select size="small" label="Delimitador" value={delimiter} onChange={(e) => handleDelimiterChange(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value=",">Coma (,)</MenuItem>
            <MenuItem value=";">Punto y coma (;)</MenuItem>
            <MenuItem value="\t">Tabulación</MenuItem>
          </TextField>
          <TextField select size="small" label="Tipo" value={importType} onChange={(e) => setImportType(e.target.value as ImportType)} sx={{ minWidth: 180 }}>
            <MenuItem value="students">Alumnos</MenuItem>
            <MenuItem value="companies">Empresas</MenuItem>
            <MenuItem value="vacancies">Vacantes</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {fileName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Archivo seleccionado: <strong>{fileName}</strong>
        </Alert>
      )}

      {headers.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            mb={1}
          >
            <Typography variant="subtitle1">Previsualización (primeras 5 filas)</Typography>
            <TextField
              size="small"
              placeholder="Buscar en las filas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          {/* Selector de mapeo dinámico según tipo */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
            {SCHEMES[importType].map((tf) => (
              <TextField key={tf} select size="small" label={tf} value={mapping[tf] || ''}
                onChange={(e) => onChangeMapping(tf, e.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value=""><em>—</em></MenuItem>
                {headers.map((h) => (
                  <MenuItem key={h} value={h}>{h}</MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                {headers.map((h, i) => (
                  <TableCell key={i}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, ri) => (
                <TableRow key={ri}>
                  {headers.map((h, ci) => (
                    <TableCell key={ci}>{row[h] ?? ""}</TableCell>
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={headers.length || 1} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No hay filas para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {headers.length > 0 && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={handleImport} disabled={uploading}>
            {importType === 'students' ? 'Importar Alumnos' : 
            importType === 'companies' ? 'Importar Empresas' : 
            'Importar Vacantes'}
          </Button>
          <Button variant="outlined" onClick={resetAll} disabled={uploading}>
            Reset
          </Button>
        </Stack>
      )}

      {uploading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography variant="caption" color="text.secondary">Importando…</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Importación de <strong>{importType}</strong> completada. Insertados: <strong>{result.inserted}</strong>, Omitidos: <strong>{result.skipped}</strong>, Total procesado: <strong>{result.total}</strong>.
        </Alert>
      )}
    </Box>
  );
}