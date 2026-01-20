import { useMemo, useState } from "react";
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

type Company = {
  id: number;
  name: string;
  sector: string;
  contactName?: string;
  contactEmail?: string;
  location?: string;
  vacanciesOpen: number;
  notes?: string;
};

const DATA: Company[] = [
  { id: 1, name: "R. PARAGUAS", sector: "Hostelería", contactName: "RRHH", contactEmail: "rrhh@paraguas.fake", location: "Madrid", vacanciesOpen: 4 },
  { id: 2, name: "CONSTRUCCIONES GAHERJO, S.L.", sector: "Construcción", contactName: "Laura Gómez", contactEmail: "laura@gaherjo.fake", location: "Madrid", vacanciesOpen: 2 },
  { id: 3, name: "SNIPES ROPA", sector: "Comercio", contactName: "Tienda Central", contactEmail: "seleccion@snipes.fake", location: "Madrid", vacanciesOpen: 1 },
  { id: 4, name: "Restaurante Jose Luis", sector: "Hostelería", contactName: "Jefe de sala", contactEmail: "sala@joseluis.fake", location: "Madrid", vacanciesOpen: 3 },
  { id: 5, name: "TATEL", sector: "Hostelería", contactName: "Reclutamiento", contactEmail: "jobs@tatel.fake", location: "Madrid", vacanciesOpen: 2 },
];

function sectorChip(sector: string) {
  const map: Record<string, "default" | "primary" | "success" | "warning"> = {
    Hostelería: "primary",
    Construcción: "warning",
    Comercio: "success",
  };
  const color = map[sector] ?? "default";
  return <Chip label={sector} color={color} size="small" variant={color === "default" ? "outlined" : "filled"} />;
}

export default function CompaniesListPage() {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return DATA;
    return DATA.filter((c) =>
      [c.name, c.sector, c.location ?? "", c.contactName ?? ""].some((f) => f.toLowerCase().includes(term))
    );
  }, [q]);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Empresas</Typography>
        <TextField
          size="small"
          placeholder="Buscar por nombre, sector o ubicación"
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
              <TableCell>Ubicación</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>{c.name}</TableCell>
                <TableCell>{sectorChip(c.sector)}</TableCell>
                <TableCell>
                  <Chip label={`${c.vacanciesOpen} abiertas`} size="small" color={c.vacanciesOpen > 0 ? "success" : "default"} />
                </TableCell>
                <TableCell>
                  <Stack spacing={0.2}>
                    <Typography variant="body2">{c.contactName ?? "-"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.contactEmail ?? ""}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{c.location ?? "-"}</TableCell>
                <TableCell align="right">
                  <Button component={RouterLink} to={`/companies/${c.id}`} size="small">
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
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