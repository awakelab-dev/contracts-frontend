import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Paper, Stack, Typography, Chip, Button } from "@mui/material";

const DATA = [
  { id: 1, name: "R. PARAGUAS", sector: "Hostelería", contactName: "RRHH", contactEmail: "rrhh@paraguas.fake", location: "Madrid", vacanciesOpen: 4, notes: "Grupo con varios restaurantes." },
  { id: 2, name: "CONSTRUCCIONES GAHERJO, S.L.", sector: "Construcción", contactName: "Laura Gómez", contactEmail: "laura@gaherjo.fake", location: "Madrid", vacanciesOpen: 2 },
  { id: 3, name: "SNIPES ROPA", sector: "Comercio", contactName: "Tienda Central", contactEmail: "seleccion@snipes.fake", location: "Madrid", vacanciesOpen: 1 },
  { id: 4, name: "Restaurante Jose Luis", sector: "Hostelería", contactName: "Jefe de sala", contactEmail: "sala@joseluis.fake", location: "Madrid", vacanciesOpen: 3 },
  { id: 5, name: "TATEL", sector: "Hostelería", contactName: "Reclutamiento", contactEmail: "jobs@tatel.fake", location: "Madrid", vacanciesOpen: 2 },
];

export default function CompanyDetailPage() {
  const { id } = useParams();
  const company = DATA.find((c) => String(c.id) === String(id));

  if (!company) {
    return (
      <Box>
        <Typography variant="h6">Empresa no encontrada</Typography>
        <Button component={RouterLink} to="/companies" sx={{ mt: 1 }}>
          Volver a empresas
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{company.name}</Typography>
        <Button component={RouterLink} to="/companies">Volver</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.2}>
          <Typography><strong>Sector:</strong> <Chip label={company.sector} size="small" /></Typography>
          <Typography><strong>Vacantes abiertas:</strong> {company.vacanciesOpen}</Typography>
          <Typography><strong>Contacto:</strong> {company.contactName ?? "-"} ({company.contactEmail ?? "-"})</Typography>
          <Typography><strong>Ubicación:</strong> {company.location ?? "-"}</Typography>
          {company.notes && <Typography color="text.secondary">{company.notes}</Typography>}
        </Stack>
      </Paper>
    </Box>
  );
}