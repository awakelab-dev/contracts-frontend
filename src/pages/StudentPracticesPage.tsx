import { useParams, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import api from "../lib/api";
import { useEffect, useState } from "react";
import { formatDateDMY } from "../utils/date";

type PracticeRow = {
  id: number;
  expediente: string;
  company_name?: string | null;
  company_name_resolved?: string | null;
  practice_status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export default function StudentPracticesPage() {
  const { id } = useParams();
  const [rows, setRows] = useState<PracticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    const sid = Number(id);
    if (!Number.isFinite(sid)) {
      setRows([]);
      setLoading(false);
      return;
    }
    api.get<PracticeRow[]>("/practices", { params: { student_id: sid } })
      .then(({ data }) => {
        if (cancel) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar prácticas";
        setError(msg);
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });
    return () => { cancel = true; };
  }, [id]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Prácticas no laborables</Typography>
        <Button component={RouterLink} to={`/students/${id}`}>Volver</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>Histórico de prácticas</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Expediente</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Fecha inicio</TableCell>
              <TableCell>Fecha fin</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={5} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length ? (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.expediente}</TableCell>
                  <TableCell>{r.practice_status ?? "-"}</TableCell>
                  <TableCell>{r.company_name || r.company_name_resolved || "-"}</TableCell>
                  <TableCell>{formatDateDMY(r.start_date)}</TableCell>
                  <TableCell>{formatDateDMY(r.end_date)}</TableCell>
                </TableRow>
              ))
            ) : (!loading && !error && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">Sin prácticas registradas</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
