import { useParams, Link as RouterLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Box, Paper, Stack, Typography, Chip, Button } from "@mui/material";
import api from "../lib/api";
import type { Company, Vacancy } from "../types";

export default function CompanyDetailPage() {
  const { id } = useParams();
  const [company, setCompany] = useState<Company | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    Promise.all([
      api.get<Company>(`/companies/${id}`),
      api.get<Vacancy[]>(`/vacancies`),
    ])
      .then(([cRes, vRes]) => {
        if (cancel) return;
        setCompany(cRes.data);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        const status = err?.response?.status;
        if (status === 404) setNotFound(true);
        else setError(err?.response?.data?.message || err?.message || "Error al cargar empresa");
      })
      .finally(() => {
        if (cancel) return;
        setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [id]);

  const openCount = useMemo(() => {
    if (!company) return 0;
    return vacancies.filter((v) => v.company_id === company.id && v.status === "open").length;
  }, [company, vacancies]);

  if (loading) return <Typography>Cargando…</Typography>;
  if (notFound)
    return (
      <Box>
        <Typography variant="h6">Empresa no encontrada (404)</Typography>
        <Button component={RouterLink} to="/companies" sx={{ mt: 1 }}>Volver a empresas</Button>
      </Box>
    );
  if (error)
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
        <Button component={RouterLink} to="/companies" sx={{ mt: 1 }}>Volver a empresas</Button>
      </Box>
    );
  if (!company) return null;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{company.name}</Typography>
        <Button component={RouterLink} to="/companies">Volver</Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={1.2}>
          <Typography><strong>Sector:</strong> <Chip label={company.sector ?? "-"} size="small" /></Typography>
          <Typography><strong>Vacantes abiertas:</strong> {openCount}</Typography>
          <Typography><strong>Contacto:</strong> {company.contact_name ?? "-"} ({company.contact_email ?? "-"})</Typography>
          <Typography><strong>Teléfono:</strong> {company.contact_phone ?? "-"}</Typography>
          {company.notes && <Typography color="text.secondary">{company.notes}</Typography>}
        </Stack>
      </Paper>
    </Box>
  );
}
