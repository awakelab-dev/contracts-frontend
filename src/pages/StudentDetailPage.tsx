import { useParams, Link as RouterLink } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, Paper, Stack, Typography, List, ListItem, ListItemText } from "@mui/material";
import api from "../lib/api";
import type { Student, Vacancy, Company } from "../types";
import { computeMatchingScore, scoreColor } from "../utils/MatchingEngine";
import React from "react";

function FormRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 0.5 }}>
      
      <Grid size={{ xs: 12, sm: 5, md: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>

      <Grid size={{ xs: 12, sm: 7, md: 8 }}>
        <Typography variant="body2" component="div">
          {value || "-"}
        </Typography>
      </Grid>
      
    </Grid>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    if (companies.length > 0) {
      companies.forEach((c) => m.set(c.id, c.name));
    }
    return m;
  }, [companies]);

  const recommended = useMemo(() => {
    if (!student || vacancies.length === 0) return [] as { vacancy: Vacancy; score: number }[];
    
    const scored = vacancies.map((v) => ({ 
      vacancy: v, 
      score: computeMatchingScore(student, v) 
    }));
    
    return scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [student, vacancies]);

  useEffect(() => {
    const sid = String(id ?? "").trim();
    if (!sid) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    Promise.all([
      api.get<Student>(`/students/${sid}`),
      api.get<Vacancy[]>(`/vacancies`),
      api.get<Company[]>(`/companies`),
    ])
      .then(([sRes, vRes, cRes]) => {
        if (cancel) return;
        setStudent(sRes.data);
        setVacancies(Array.isArray(vRes.data) ? vRes.data : []);
        setCompanies(Array.isArray(cRes.data) ? cRes.data : []);
      })
      .catch((err) => {
        if (cancel) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(err?.response?.data?.message || err?.message || "Error");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => { cancel = true; };
  }, [id]);

  if (loading) return <Typography sx={{ p: 3 }}>Cargando datos del alumno…</Typography>;
  
  if (notFound) return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6">Alumno no encontrado (404)</Typography>
      <Button component={RouterLink} to="/students" sx={{ mt: 1 }}>Volver</Button>
    </Box>
  );

  if (error) return (
    <Box sx={{ p: 3 }}>
      <Typography color="error">Error: {error}</Typography>
      <Button component={RouterLink} to="/students" sx={{ mt: 1 }}>Volver</Button>
    </Box>
  );

  if (!student) return null;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{student.full_name}</Typography>
        <Button component={RouterLink} to="/students">Volver</Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>DATOS DEL ALUMNO</Typography>
        <FormRow label="ID" value={student.id} />
        <FormRow label="NOMBRE COMPLETO" value={student.full_name} />
        <FormRow label="DNI / NIE" value={student.dni_nie} />
        <FormRow label="CURSO FORMACIÓN" value={student.course_code} />
        <FormRow label="SITUACIÓN LABORAL" value={student.employment_status} />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>VACANTES RECOMENDADAS</Typography>
        {recommended.length ? (
          <List dense>
            {recommended.map(({ vacancy, score }) => (
              <ListItem key={vacancy.id} disableGutters secondaryAction={
                <Button component={RouterLink} to={`/vacancies/${vacancy.id}`} size="small">Ver</Button>
              }>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body1">{vacancy.title}</Typography>
                      <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                    </Stack>
                  }
                  secondary={`Empresa: ${companyName.get(vacancy.company_id) || `ID #${vacancy.company_id}`} — Sector: ${vacancy.sector ?? "-"}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">No hay recomendaciones para este perfil aún.</Typography>
        )}
      </Paper>
    </Box>
  );
}
