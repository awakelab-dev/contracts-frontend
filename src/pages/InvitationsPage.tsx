import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink, useLocation } from "react-router-dom";
import api from "../lib/api";
import type { Student } from "../types";

type InvitationRow = {
  id: number;
  vacancy_id: number;
  student_id: number;
  status: "sent" | "accepted" | "rejected" | "expired";
  sent_at: string;
  responded_at?: string | null;
  vacancy_title: string;
  vacancy_sector?: string | null;
  company_id: number;
  company_name: string;
};

type Row = InvitationRow & { studentName: string };

function fmtDate(v: unknown): string {
  if (!v) return "-";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function statusChip(s: InvitationRow["status"]) {
  switch (s) {
    case "sent":
      return <Chip label="Enviada" size="small" />;
    case "accepted":
      return <Chip label="Aceptada" color="success" size="small" />;
    case "rejected":
      return <Chip label="Rechazada" color="warning" size="small" />;
    case "expired":
      return <Chip label="Expirada" size="small" variant="outlined" />;
  }
}

export default function InvitationsPage() {
  const location = useLocation();

  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | InvitationRow["status"]>("all");
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);

    Promise.all([api.get<InvitationRow[]>("/invitations"), api.get<Student[]>("/students")])
      .then(([iRes, sRes]) => {
        if (cancel) return;
        setInvitations(Array.isArray(iRes.data) ? iRes.data : []);
        setStudents(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar invitaciones";
        setError(msg);
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, []);

  const studentNameById = useMemo(() => {
    const m = new Map<number, string>();
    students.forEach((s) => m.set(s.id, `${s.first_names} ${s.last_names}`.trim()));
    return m;
  }, [students]);

  const rows = useMemo<Row[]>(() => {
    const term = q.trim().toLowerCase();
    return invitations
      .map((inv) => ({
        ...inv,
        studentName: studentNameById.get(inv.student_id) || `Alumno #${inv.student_id}`,
      }))
      .filter((inv) => st === "all" || inv.status === st)
      .filter((inv) => {
        if (!term) return true;
        return [inv.studentName, inv.vacancy_title, inv.company_name].some((f) => (f || "").toLowerCase().includes(term));
      });
  }, [invitations, q, st, studentNameById]);

  useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q, st]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h5">Invitaciones</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            placeholder="Buscar por alumno, vacante o empresa"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={st}
            onChange={(e) => setSt(e.target.value as any)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="sent">Enviadas</MenuItem>
            <MenuItem value="accepted">Aceptadas</MenuItem>
            <MenuItem value="rejected">Rechazadas</MenuItem>
            <MenuItem value="expired">Expiradas</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alumno</TableCell>
              <TableCell>Vacante</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Enviada</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>Respuesta</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              !error &&
              pagedRows.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell>{inv.studentName}</TableCell>
                  <TableCell>{inv.vacancy_title}</TableCell>
                  <TableCell>{inv.company_name}</TableCell>
                  <TableCell>{statusChip(inv.status)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(inv.sent_at)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{inv.responded_at ? fmtDate(inv.responded_at) : "-"}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        component={RouterLink}
                        to={`/students/${inv.student_id}`}
                        state={{ from: location.pathname + location.search }}
                        size="small"
                      >
                        Ver alumno
                      </Button>
                      <Button
                        component={RouterLink}
                        to={`/vacancies/${inv.vacancy_id}`}
                        state={{ from: location.pathname + location.search }}
                        size="small"
                        variant="outlined"
                      >
                        Ver vacante
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay invitaciones que coincidan con el filtro
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={rows.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Filas por página"
        />
      </Paper>
    </Box>
  );
}
