import { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import api from "../lib/api";

type TransactionHistoryRow = {
  id: number;
  company_id: number;
  user: string;
  description: string;
  created_at: string;
};

type Props = {
  companyId: number;
};

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-ES");
}

export default function TransactionHistoryPanel({ companyId }: Props) {
  const [rows, setRows] = useState<TransactionHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [description, setDescription] = useState("");

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<TransactionHistoryRow[]>(`/transaction-history/${companyId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al cargar historial");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api
      .get<TransactionHistoryRow[]>(`/transaction-history/${companyId}`)
      .then(({ data }) => {
        if (cancel) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e: any) => {
        if (cancel) return;
        setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al cargar historial");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [companyId]);

  async function saveTransaction() {
    const cleanDescription = description.trim();
    if (!cleanDescription) {
      setActionError("La descripción es obligatoria");
      return;
    }

    try {
      setSaving(true);
      setActionError(null);
      setActionOk(null);
      if (editingRowId) {
        await api.put(`/transaction-history/${companyId}/${editingRowId}`, {
          description: cleanDescription,
        });
      } else {
        await api.post("/transaction-history", {
          company_id: companyId,
          description: cleanDescription,
        });
      }
      setDescription("");
      setEditingRowId(null);
      setDialogOpen(false);
      await loadHistory();
      setActionOk(editingRowId ? "Transacción actualizada" : "Transacción agregada");
    } catch (e: any) {
      setActionError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Error al guardar transacción"
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditTransaction(row: TransactionHistoryRow) {
    setActionError(null);
    setActionOk(null);
    setEditingRowId(row.id);
    setDescription(row.description || "");
    setDialogOpen(true);
  }

  async function deleteTransaction(rowId: number) {
    const ok = window.confirm("¿Eliminar esta transacción?");
    if (!ok) return;

    try {
      setActionError(null);
      setActionOk(null);
      await api.delete(`/transaction-history/${companyId}/${rowId}`);
      await loadHistory();
      setActionOk("Transacción eliminada");
    } catch (e: any) {
      setActionError(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Error al eliminar transacción"
      );
    }
  }

  return (
    <Paper sx={{ p: 2, mt: 2, height: "100%" }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Typography variant="h6">Historial de Obbservaciones</Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setActionError(null);
              setActionOk(null);
              setEditingRowId(null);
              setDescription("");
              setDialogOpen(true);
            }}
          >
            Agregar
          </Button>
        </Stack>

        {actionError && (
          <Alert severity="error" onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}
        {actionOk && (
          <Alert severity="success" onClose={() => setActionOk(null)}>
            {actionOk}
          </Alert>
        )}

        {loading ? (
          <Typography color="text.secondary">Cargando historial…</Typography>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">No hay observaciones registradas.</Typography>
        ) : (
          <Stack spacing={1}>
            {rows.map((row) => (
              <Paper key={row.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", md: "center" }}
                >
                  <Stack spacing={0.4}>
                    <Typography variant="body2">
                      <strong>Usuario:</strong> {row.user || "-"}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Fecha:</strong> {formatDateTime(row.created_at)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Descripción:</strong> {row.description || "-"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => openEditTransaction(row)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => deleteTransaction(row.id)}>
                      Eliminar
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingRowId ? "Editar transacción" : "Agregar transacción"}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 0.5 }}>
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveTransaction} disabled={saving}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
