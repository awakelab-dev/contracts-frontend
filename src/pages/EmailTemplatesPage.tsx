import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Chip,
  Button,
  Toolbar,
  Tooltip,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

type Template = {
  id: string;
  name: string;   // visible
  code: string;   // key (p. ej. 'cv_request')
  subject: string;
  body: string;   // texto plano o HTML simple
};

const LS_KEY = "emailTemplates.v1";

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: cryptoRandom(),
    name: "Solicitud de CV",
    code: "cv_request",
    subject: "Solicitud de CV actualizado",
    body:
      "Hola {nombre},\n\n" +
      "Necesitamos tu CV actualizado para continuar con tu proceso. " +
      "Puedes subirlo en el siguiente enlace: {linkSubida}\n\n" +
      "Muchas gracias.",
  },
  {
    id: cryptoRandom(),
    name: "Actualización de estado laboral",
    code: "status_request",
    subject: "Actualiza tu estado laboral",
    body:
      "Hola {nombre},\n\n" +
      "¿Podrías indicarnos tu situación laboral actual? Si has empezado en un nuevo empleo, " +
      "cuéntanos los detalles en este formulario: {linkFormulario}\n\n" +
      "Gracias por tu colaboración.",
  },
  {
    id: cryptoRandom(),
    name: "Invitación a vacante",
    code: "job_invitation",
    subject: "Invitación a la vacante: {nombreVacante}",
    body:
      "Hola {nombre},\n\n" +
      "Tenemos una oportunidad para el puesto {nombreVacante} en {empresa}. " +
      "Si te interesa, confirma aquí: {linkConfirmacion}\n\n" +
      "Quedamos atentos.",
  },
];

function cryptoRandom() {
  // ID simple
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_TEMPLATES;
    const parsed = JSON.parse(raw) as Template[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_TEMPLATES;
    return parsed;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(templates: Template[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(templates));
  } catch {
    // ignore
  }
}

function extractVars(text: string): string[] {
  const set = new Set<string>();
  const re = /\{(\w+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) set.add(m[1]);
  return Array.from(set);
}

const SAMPLE_VARS: Record<string, string> = {
  nombre: "María Pérez",
  linkSubida: "https://ejemplo.com/subir-cv",
  linkFormulario: "https://ejemplo.com/estado-laboral",
  nombreVacante: "Camarero/a terraza",
  empresa: "R. PARAGUAS",
  linkConfirmacion: "https://ejemplo.com/confirmar",
};

function applyVariables(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? `{${v}}`));
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedOpen, setSavedOpen] = useState(false);

  // refs para insertar variables en el cursor
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    if (templates.length && !selectedId) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  const selIndex = useMemo(
    () => templates.findIndex((t) => t.id === selectedId),
    [templates, selectedId]
  );
  const sel = selIndex >= 0 ? templates[selIndex] : null;

  const vars = useMemo(() => {
    if (!sel) return [];
    const subjectVars = extractVars(sel.subject);
    const bodyVars = extractVars(sel.body);
    return Array.from(new Set([...subjectVars, ...bodyVars]));
  }, [sel]);

  function updateSelected(patch: Partial<Template>) {
    if (selIndex < 0) return;
    const next = templates.slice();
    next[selIndex] = { ...next[selIndex], ...patch };
    setTemplates(next);
  }

  function handleSave() {
    saveTemplates(templates);
    setSavedOpen(true);
  }

  function handleResetDefaults() {
    setTemplates(DEFAULT_TEMPLATES.map((t) => ({ ...t, id: cryptoRandom() })));
    setSelectedId(null);
    setSavedOpen(true);
  }

  function addTemplate() {
    const t: Template = {
      id: cryptoRandom(),
      name: "Nueva plantilla",
      code: "custom_" + Math.random().toString(36).slice(2, 6),
      subject: "Asunto",
      body: "Hola {nombre},\n\nEscribe aquí el contenido...",
    };
    setTemplates((prev) => [t, ...prev]);
    setSelectedId(t.id);
  }

  function duplicateTemplate() {
    if (!sel) return;
    const t: Template = {
      ...sel,
      id: cryptoRandom(),
      name: sel.name + " (copia)",
      code: sel.code + "_copy",
    };
    setTemplates((prev) => [t, ...prev]);
    setSelectedId(t.id);
  }

  function deleteTemplate() {
    if (!sel) return;
    const next = templates.filter((t) => t.id !== sel.id);
    setTemplates(next);
    setSelectedId(next[0]?.id ?? null);
  }

  function insertVar(token: string, target: "subject" | "body") {
    if (target === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + `{${token}}` + el.value.slice(end);
      updateSelected({ subject: next });
      // recolocar cursor
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + token.length + 2;
      });
    } else if (target === "body" && bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = el.value.slice(0, start) + `{${token}}` + el.value.slice(end);
      updateSelected({ body: next });
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + token.length + 2;
      });
    }
  }

  const previewSubject = useMemo(
    () => (sel ? applyVariables(sel.subject, SAMPLE_VARS) : ""),
    [sel]
  );
  const previewBody = useMemo(
    () => (sel ? applyVariables(sel.body, SAMPLE_VARS) : ""),
    [sel]
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Plantillas de email</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Nueva plantilla">
            <IconButton color="primary" onClick={addTemplate}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicar">
            <span>
              <IconButton onClick={duplicateTemplate} disabled={!sel}>
                <ContentCopyIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Eliminar">
            <span>
              <IconButton color="error" onClick={deleteTemplate} disabled={!sel}>
                <DeleteOutlineIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Guardar (localStorage)">
            <IconButton color="primary" onClick={handleSave}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restaurar por defecto">
            <IconButton onClick={handleResetDefaults}>
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
        {/* Lista de plantillas */}
        <Paper sx={{ width: 280, flexShrink: 0 }}>
          <Toolbar />
          <Divider />
          <List dense disablePadding>
            {templates.map((t) => (
              <ListItemButton
                key={t.id}
                selected={t.id === selectedId}
                onClick={() => setSelectedId(t.id)}
              >
                <ListItemText
                  primary={t.name}
                  secondary={t.code}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
            ))}
            {templates.length === 0 && (
              <ListItemButton disabled>
                <ListItemText primary="Sin plantillas" />
              </ListItemButton>
            )}
          </List>
        </Paper>

        {/* Editor y vista previa */}
        <Stack spacing={2} sx={{ flex: 1, minWidth: 300 }}>
          <Paper sx={{ p: 2 }}>
            {sel ? (
              <Stack spacing={2}>
                <TextField
                  label="Nombre visible"
                  value={sel.name}
                  onChange={(e) => updateSelected({ name: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Código"
                  helperText="Identificador interno (p. ej. cv_request)"
                  value={sel.code}
                  onChange={(e) => updateSelected({ code: e.target.value })}
                  size="small"
                  fullWidth
                />

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Asunto</Typography>
                    <Stack direction="row" spacing={1}>
                      {vars.map((v) => (
                        <Chip
                          key={"s-" + v}
                          label={`{${v}}`}
                          size="small"
                          onClick={() => insertVar(v, "subject")}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  <TextField
                    inputRef={subjectRef}
                    value={sel.subject}
                    onChange={(e) => updateSelected({ subject: e.target.value })}
                    size="small"
                    fullWidth
                  />
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Cuerpo</Typography>
                    <Stack direction="row" spacing={1}>
                      {vars.map((v) => (
                        <Chip
                          key={"b-" + v}
                          label={`{${v}}`}
                          size="small"
                          onClick={() => insertVar(v, "body")}
                        />
                      ))}
                    </Stack>
                  </Stack>
                  <TextField
                    inputRef={bodyRef}
                    value={sel.body}
                    onChange={(e) => updateSelected({ body: e.target.value })}
                    size="small"
                    fullWidth
                    multiline
                    minRows={10}
                  />
                </Stack>
              </Stack>
            ) : (
              <Typography color="text.secondary">Selecciona o crea una plantilla.</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Vista previa (valores de ejemplo)
            </Typography>
            {sel ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2">Asunto</Typography>
                <Typography>{previewSubject}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2">Cuerpo</Typography>
                <Typography sx={{ whiteSpace: "pre-wrap" }}>{previewBody}</Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">Sin plantilla seleccionada</Typography>
            )}
          </Paper>
        </Stack>
      </Stack>

      <Snackbar
        open={savedOpen}
        autoHideDuration={2000}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSavedOpen(false)}>
          Guardado en localStorage
        </Alert>
      </Snackbar>
    </Box>
  );
}