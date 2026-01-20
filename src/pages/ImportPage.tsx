import React, { useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import SearchIcon from "@mui/icons-material/Search";

type Parsed = {
  headers: string[];
  rows: string[][];
};

function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = candidates[0];
  let max = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > max) {
      max = count;
      best = d;
    }
  }
  return best;
}

function parseCsv(text: string, delimiter: string): Parsed {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const cells = lines.map((l) => l.split(delimiter));
  const [headers, ...rows] = cells;
  return { headers: headers ?? [], rows };
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [delimiter, setDelimiter] = useState(",");
  const [parsed, setParsed] = useState<Parsed>({ headers: [], rows: [] });
  const [query, setQuery] = useState("");
  const [simulation, setSimulation] = useState<{ ok: number; errors: number } | null>(null);

  const visibleRows = useMemo(() => {
    if (!query) return parsed.rows.slice(0, 30);
    const q = query.toLowerCase();
    return parsed.rows
      .filter((r) => r.some((c) => (c || "").toLowerCase().includes(q)))
      .slice(0, 50);
  }, [parsed.rows, query]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const text = await f.text();
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    const autoDelim = detectDelimiter(firstLine);
    setDelimiter(autoDelim);
    setParsed(parseCsv(text, autoDelim));
    setSimulation(null);
  };

  const handleDelimiterChange = (value: string) => {
    setDelimiter(value);
    setSimulation(null);
    // reparse with new delimiter if we still have the original text? para demo,
    // volvemos a pedir archivo si ya no hay texto. En este modo simple,
    // sólo afecta a archivos que abras después.
  };

  const simulateImport = () => {
    if (!parsed.headers.length) return;
    const dniIndex = parsed.headers.findIndex((h) =>
      h.toLowerCase().includes("dni") || h.toLowerCase().includes("nie")
    );
    const nameIndex = parsed.headers.findIndex((h) =>
      h.toLowerCase().includes("nombre")
    );

    let ok = 0;
    let errors = 0;
    const seen = new Set<string>();

    parsed.rows.forEach((r) => {
      const dni = (dniIndex >= 0 ? r[dniIndex] : "").trim();
      const name = (nameIndex >= 0 ? r[nameIndex] : "").trim();
      if (!dni || !name) {
        errors++;
        return;
      }
      if (seen.has(dni)) {
        errors++;
        return;
      }
      seen.add(dni);
      ok++;
    });

    setSimulation({ ok, errors });
  };

  const resetAll = () => {
    setFileName("");
    setParsed({ headers: [], rows: [] });
    setSimulation(null);
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
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={handlePickFile}
          >
            Seleccionar archivo
          </Button>
          <TextField
            select
            size="small"
            label="Delimitador"
            value={delimiter}
            onChange={(e) => handleDelimiterChange(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value=",">Coma (,)</MenuItem>
            <MenuItem value=";">Punto y coma (;)</MenuItem>
            <MenuItem value="\t">Tabulación</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {fileName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Archivo seleccionado: <strong>{fileName}</strong>
        </Alert>
      )}

      {parsed.headers.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            mb={1}
          >
            <Typography variant="subtitle1">Previsualización (primeras filas)</Typography>
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

          <Table size="small">
            <TableHead>
              <TableRow>
                {parsed.headers.map((h, i) => (
                  <TableCell key={i}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row, ri) => (
                <TableRow key={ri}>
                  {parsed.headers.map((_, ci) => (
                    <TableCell key={ci}>{row[ci] ?? ""}</TableCell>
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={parsed.headers.length || 1}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No hay filas para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {parsed.headers.length > 0 && (
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={simulateImport}>
            Simular importación
          </Button>
          <Button variant="text" onClick={resetAll}>
            Reset
          </Button>
        </Stack>
      )}

      {simulation && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle1">Resultado de simulación</Typography>
            <Chip label={`OK: ${simulation.ok}`} color="success" size="small" />
            <Chip
              label={`Errores: ${simulation.errors}`}
              color={simulation.errors ? "warning" : "default"}
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta simulación sólo valida que cada fila tenga DNI/NIE y Nombre (si existen
            columnas con esos nombres) y que no haya DNI/NIE duplicados. No llama al
            backend; es sólo una vista previa de calidad de datos.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}