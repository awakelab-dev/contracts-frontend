import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Link as RouterLink } from "react-router-dom";
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
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      [c.name, c.sector ?? "", c.contact_name ?? "", c.contact_email ?? ""].some((f) =>
        f.toLowerCase().includes(term)
      )
    );
  }, [q, companies, openByCompany]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Empresas</Typography>
        <TextField
          size="small"
          placeholder="Buscar por nombre, sector o contacto"
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
              <TableCell>Empresa</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Vacantes</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell align="right">Acciones</TableCell>
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
            {!loading && !error && rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
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
                <TableCell align="right">
                  <Button component={RouterLink} to={`/companies/${c.id}`} size="small">
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No hay resultados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
