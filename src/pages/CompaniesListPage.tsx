import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Chip,
  InputAdornment,
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
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Company, Vacancy } from "../types";

function sectorChip(sector?: string | null) {
  const s = sector || "-";
  const map: Record<string, "default" | "primary" | "success" | "warning"> = {
    Hostelería: "primary",
    Construcción: "warning",
    Comercio: "success",
  };
  const color = map[s] ?? "default";
  return <Chip label={s} color={color} size="small" variant={color === "default" ? "outlined" : "filled"} />;
}

export default function CompaniesListPage() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Company[]>("/companies"),
      api.get<Vacancy[]>("/vacancies"),
    ])
      .then(([cRes, vRes]) => {
        if (cancel) return;
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const msg = err?.response?.data?.message || err?.message || "Error al cargar empresas";
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

  const openByCompany = useMemo(() => {
    const map = new Map<number, number>();
    for (const v of vacancies) {
      if (v.status === "open") {
        map.set(v.company_id, (map.get(v.company_id) || 0) + 1);
      }
    }
    return map;
  }, [vacancies]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = companies.map((c) => ({
      ...c,
      vacanciesOpen: openByCompany.get(c.id) || 0,
    }));
    if (!term) return list;
    return list.filter((c) =>
      [
        c.nif ?? "",
        c.name,
        c.sector ?? "",
        c.company_email ?? "",
        c.company_phone ?? "",
        c.contact_name ?? "",
        c.contact_email ?? "",
      ].some((f) => f.toLowerCase().includes(term))
    );
  }, [q, companies, openByCompany]);

  useEffect(() => {
    // Cuando cambia el filtro, volvemos a la primera página.
    setPage(0);
  }, [q]);

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return rows.slice(start, end);
  }, [rows, page, rowsPerPage]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Empresas</Typography>
        <TextField
          size="small"
          placeholder="Buscar por NIF, nombre, sector, email o contacto"
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
      </Stack>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre / Razón Social</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Vacantes</TableCell>
              <TableCell>Contacto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Cargando…
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error &&
              pagedRows.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") navigate(`/companies/${c.id}`);
                  }}
                >
                  <TableCell>
                    <Stack spacing={0.2}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        NIF: {c.nif ?? "-"}
                      </Typography>
                      {(c.company_email || c.company_phone) && (
                        <Typography variant="caption" color="text.secondary">
                          {[c.company_email, c.company_phone].filter(Boolean).join(" · ")}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{sectorChip(c.sector)}</TableCell>
                  <TableCell>
                    <Chip label={`${c.vacanciesOpen} abiertas`} size="small" color={c.vacanciesOpen > 0 ? "success" : "default"} />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.2}>
                      <Typography variant="body2">{c.contact_name ?? "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.contact_email ?? ""}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay resultados
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
