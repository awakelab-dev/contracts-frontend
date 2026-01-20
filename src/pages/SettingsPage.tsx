import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Button,
  Snackbar,
  Alert,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

type Settings = {
  apiBaseUrl: string;
  theme: "light" | "dark";
  importDelimiter: "," | ";" | "\t";
  importRememberMapping: boolean;
  emailFrom: string;
};

const LS_KEYS = {
  apiBaseUrl: "app.apiBaseUrl",
  theme: "app.theme",
  importDelimiter: "import.defaultDelimiter",
  importRememberMapping: "import.rememberMapping",
  emailFrom: "email.defaultFrom",
} as const;

const DEFAULTS: Settings = {
  apiBaseUrl: (import.meta as any).env?.VITE_API_URL || "http://localhost:4000",
  theme: "light",
  importDelimiter: ",",
  importRememberMapping: true,
  emailFrom: "no-reply@tu-dominio.fake",
};

function loadSettings(): Settings {
  const s: Settings = { ...DEFAULTS };
  try {
    const apiBaseUrl = localStorage.getItem(LS_KEYS.apiBaseUrl);
    const theme = localStorage.getItem(LS_KEYS.theme) as Settings["theme"] | null;
    const importDelimiter = localStorage.getItem(LS_KEYS.importDelimiter) as Settings["importDelimiter"] | null;
    const importRememberMapping = localStorage.getItem(LS_KEYS.importRememberMapping);
    const emailFrom = localStorage.getItem(LS_KEYS.emailFrom);

    if (apiBaseUrl) s.apiBaseUrl = apiBaseUrl;
    if (theme === "light" || theme === "dark") s.theme = theme;
    if (importDelimiter === "," || importDelimiter === ";" || importDelimiter === "\t") s.importDelimiter = importDelimiter;
    if (importRememberMapping !== null) s.importRememberMapping = importRememberMapping === "true";
    if (emailFrom) s.emailFrom = emailFrom;
  } catch {
    // ignore
  }
  return s;
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(LS_KEYS.apiBaseUrl, s.apiBaseUrl);
    localStorage.setItem(LS_KEYS.theme, s.theme);
    localStorage.setItem(LS_KEYS.importDelimiter, s.importDelimiter);
    localStorage.setItem(LS_KEYS.importRememberMapping, String(s.importRememberMapping));
    localStorage.setItem(LS_KEYS.emailFrom, s.emailFrom);
  } catch {
    // ignore
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const onSave = () => {
    saveSettings(settings);
    setSaved(true);
  };

  const onReset = () => {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    setSettings(loadSettings());
    setSaved(true);
  };

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const onReload = () => {
    window.location.reload();
  };

  return (
    <Box>
      <Typography variant="h5" mb={2}>Configuración</Typography>

      {/* Preferencias de la app */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Preferencias</Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <TextField
            label="API Base URL (override)"
            helperText="Usada por el frontend. Si cambias este valor, recarga la app."
            value={settings.apiBaseUrl}
            onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
            size="small"
            sx={{ minWidth: 360 }}
          />
          <TextField
            select
            label="Tema"
            value={settings.theme}
            onChange={(e) => setSettings({ ...settings, theme: e.target.value as Settings["theme"] })}
            size="small"
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="light">Claro</MenuItem>
            <MenuItem value="dark">Oscuro</MenuItem>
          </TextField>
        </Stack>

        <Stack direction="row" spacing={1} mt={2}>
          <Button variant="contained" onClick={onSave}>Guardar</Button>
          <Button variant="outlined" onClick={onReload}>Recargar app</Button>
          <Button variant="text" onClick={onReset}>Restablecer valores</Button>
        </Stack>
      </Paper>

      {/* Importación */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Importación</Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <TextField
            select
            label="Delimitador por defecto"
            value={settings.importDelimiter}
            onChange={(e) => setSettings({ ...settings, importDelimiter: e.target.value as Settings["importDelimiter"] })}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value=",">Coma (,)</MenuItem>
            <MenuItem value=";">Punto y coma (;)</MenuItem>
            <MenuItem value="\t">Tabulación</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={settings.importRememberMapping}
                onChange={(e) => setSettings({ ...settings, importRememberMapping: e.target.checked })}
              />
            }
            label="Recordar mapeo de columnas (local)"
          />
        </Stack>
      </Paper>

      {/* Email */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Correo</Typography>
        <Divider sx={{ mb: 2 }} />
        <TextField
          label="Remitente por defecto"
          helperText="Visible en las plantillas y envíos de prueba (modo demo)."
          value={settings.emailFrom}
          onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
          size="small"
          sx={{ minWidth: 360 }}
        />
      </Paper>

      {/* Sesión */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom>Sesión</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1}>
          <Button color="error" variant="outlined" onClick={onLogout}>Cerrar sesión</Button>
        </Stack>
      </Paper>

      <Snackbar
        open={saved}
        autoHideDuration={2000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSaved(false)} severity="success" variant="filled">
          Configuración guardada
        </Alert>
      </Snackbar>
    </Box>
  );
}