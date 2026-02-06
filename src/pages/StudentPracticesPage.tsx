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
import type { Internship } from "../types";
import { formatDateDMY } from "../utils/date";

export default function StudentPracticesPage() {
  const { id } = useParams();
  const [rows, setRows] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    api.get<Internship[]>("/internships")
      .then(({ data }) => {
        if (cancel) return;
        const all = Array.isArray(data) ? data : [];
        const sid = Number(id);
        setRows(all.filter((r) => r.student_id === sid));
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
              <TableCell>Empresa</TableCell>
              <TableCell>Fecha inicio</TableCell>
              <TableCell>Fecha fin</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={3} align="center">Cargando…</TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={3} align="center">Error: {error}</TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length ? (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.company_name}</TableCell>
                  <TableCell>{formatDateDMY(r.start_date)}</TableCell>
                  <TableCell>{formatDateDMY(r.end_date)}</TableCell>
                </TableRow>
              ))
            ) : (!loading && !error && (
              <TableRow>
                <TableCell colSpan={3} align="center">
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
