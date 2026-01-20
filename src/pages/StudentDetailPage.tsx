import { useParams, Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

type Student = {
  id: string;
  // Sección 1 - Datos personales
  expediente: string;
  cursoFormacion: string;
  tecnicoLaboral: string;
  nombre: string;
  apellidos: string;
  dniNie: string;
  nss: string; // Nº Seguridad Social
  fechaNacimiento: string; // yyyy-mm-dd
  edad: number;
  distrito: string;
  telefono: string;
  email: string;

  // Sección 2 - Datos laborales
  permisoTrabajo: string; // Sí/No/En trámite
  situacionLaboral: string; // Desempleado, Trabajando, etc.
  discapacidad: string; // Sí/No
  tipoDiscapacidad?: string;
  certificadoVulnerabilidad: string; // Sí/No
  cv: string; // Sí/No
  formacion: string; // máxima formación
  practicas: string; // Sí/No + detalle
  disponibilidadPracticas: string; // inmediata, parcial, etc.
  observaciones?: string;

  // Sección 3 - Propuestas laborales
  trabajando: string; // Sí/No
  hanTrabajado: string; // Sí/No
  propuestas: { empleo: string; fecha: string; aceptacion: string }[];

  // Sección 4 - Inserción laboral
  inserciones: {
    sector: string;
    puesto: string;
    empresa: string;
    tipoContrato: string;
    jornada: string;
    diasTrabajados: number;
    fechaInicio: string;
    fechaFin?: string;
  }[];
};

const STUDENTS: Record<string, Student> = {
  "1": {
    id: "1",
    expediente: "EXP-2025-001",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Luis Gómez",
    nombre: "ANTHONY JOSUE",
    apellidos: "BRUFAU MODESTO",
    dniNie: "Y3451629X",
    nss: "12 34567890 01",
    fechaNacimiento: "1996-03-12",
    edad: 29,
    distrito: "Centro",
    telefono: "600123456",
    email: "anthony.brufau@example.com",
    permisoTrabajo: "Sí",
    situacionLaboral: "Mejora empleo",
    discapacidad: "No",
    certificadoVulnerabilidad: "No",
    cv: "Sí",
    formacion: "ESO",
    practicas: "Sí (R. PARAGUAS 2025-05-29 a 2025-06-07)",
    disponibilidadPracticas: "Inmediata",
    observaciones: "Asiste puntualmente.",
    trabajando: "No",
    hanTrabajado: "Sí",
    propuestas: [
      { empleo: "Operario obra", fecha: "2025-07-30", aceptacion: "Pendiente" },
      { empleo: "Ayudante de cocina", fecha: "2025-08-15", aceptacion: "Sí" },
      { empleo: "Camarero/a de sala", fecha: "2025-09-02", aceptacion: "No" },
    ],
    inserciones: [
      {
        sector: "Construcción",
        puesto: "Operario obra",
        empresa: "CONSTRUCCIONES GAHERJO, S.L.",
        tipoContrato: "Temporal",
        jornada: "Completa",
        diasTrabajados: 10,
        fechaInicio: "2025-06-26",
      },
      {
        sector: "Hostelería",
        puesto: "Peón mantenimiento",
        empresa: "SERVIMAD S.A.",
        tipoContrato: "Temporal",
        jornada: "Parcial",
        diasTrabajados: 25,
        fechaInicio: "2025-09-10",
        fechaFin: "2025-10-05",
      },
    ],
  },
  "2": {
    id: "2",
    expediente: "EXP-2025-002",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Ana Ruiz",
    nombre: "DELIA",
    apellidos: "FERNANDINO LÓPEZ",
    dniNie: "06655123G",
    nss: "11 22334455 02",
    fechaNacimiento: "1993-11-02",
    edad: 32,
    distrito: "Tetuán",
    telefono: "600234567",
    email: "delia.fernandino@example.com",
    permisoTrabajo: "Sí",
    situacionLaboral: "Sin empleo",
    discapacidad: "No",
    certificadoVulnerabilidad: "Sí",
    cv: "Sí",
    formacion: "FP Medio",
    practicas: "Sí (R. PARAGUAS 2025-05-29 a 2025-06-18)",
    disponibilidadPracticas: "Mañanas",
    trabajando: "No",
    hanTrabajado: "No",
    propuestas: [],
    inserciones: [],
  },
  "3": {
    id: "3",
    expediente: "EXP-2025-003",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Ana Ruiz",
    nombre: "ESTEFANY",
    apellidos: "QUIÑOY IBÁÑEZ",
    dniNie: "55945510B",
    nss: "28 99887766 03",
    fechaNacimiento: "1999-07-14",
    edad: 26,
    distrito: "Carabanchel",
    telefono: "600345678",
    email: "estefany.quinoy@example.com",
    permisoTrabajo: "En trámite",
    situacionLaboral: "Sin empleo",
    discapacidad: "No",
    certificadoVulnerabilidad: "No",
    cv: "No",
    formacion: "ESO",
    practicas: "Sí (R. PARAGUAS 2025-05-30 a 2025-06-08)",
    disponibilidadPracticas: "Tardes",
    observaciones: "Pendiente de documentación.",
    trabajando: "No",
    hanTrabajado: "No",
    propuestas: [
      { empleo: "Aux. sala", fecha: "2025-07-30", aceptacion: "No" },
    ],
    inserciones: [],
  },
  "4": {
    id: "4",
    expediente: "EXP-2025-004",
    cursoFormacion: "AYUDANTE CAMARERO/A",
    tecnicoLaboral: "Luis Gómez",
    nombre: "JEROME MICHAEL",
    apellidos: "MASONGSONG",
    dniNie: "Y3245604L",
    nss: "16 11223344 04",
    fechaNacimiento: "1991-01-22",
    edad: 35,
    distrito: "Usera",
    telefono: "600456789",
    email: "jerome.masongsong@example.com",
    permisoTrabajo: "Sí",
    situacionLaboral: "Trabajando",
    discapacidad: "No",
    certificadoVulnerabilidad: "No",
    cv: "No",
    formacion: "FP Superior",
    practicas: "Sí (R. PARAGUAS 2025-05-29 a 2025-06-07)",
    disponibilidadPracticas: "N/A",
    trabajando: "Sí",
    hanTrabajado: "Sí",
    propuestas: [
      { empleo: "Runner", fecha: "2025-06-10", aceptacion: "Sí" },
    ],
    inserciones: [
      {
        sector: "Hostelería",
        puesto: "Runner",
        empresa: "PARAGUAS",
        tipoContrato: "Indefinido",
        jornada: "Completa",
        diasTrabajados: 180,
        fechaInicio: "2025-06-16",
      },
      {
        sector: "Hostelería",
        puesto: "Ayudante sala",
        empresa: "Grupo La Terraza",
        tipoContrato: "Temporal",
        jornada: "Parcial",
        diasTrabajados: 30,
        fechaInicio: "2025-11-01",
        fechaFin: "2025-11-30",
      },
    ],
  },
  "5": {
    id: "5",
    expediente: "EXP-2025-005",
    cursoFormacion: "COCINA BÁSICA",
    tecnicoLaboral: "María Díaz",
    nombre: "MARÍA CARLOTA",
    apellidos: "GARCÍA PÉREZ",
    dniNie: "83214566K",
    nss: "10 33445566 05",
    fechaNacimiento: "1998-10-05",
    edad: 27,
    distrito: "Chamartín",
    telefono: "600567890",
    email: "maria.garcia@example.com",
    permisoTrabajo: "Sí",
    situacionLaboral: "Sin empleo",
    discapacidad: "Sí",
    tipoDiscapacidad: "Auditiva",
    certificadoVulnerabilidad: "Sí",
    cv: "Sí",
    formacion: "Bachillerato",
    practicas: "No",
    disponibilidadPracticas: "Inmediata",
    observaciones: "Interesada en pastelería.",
    trabajando: "No",
    hanTrabajado: "Sí",
    propuestas: [],
    inserciones: [],
  },
  "6": {
    id: "6",
    expediente: "EXP-2025-006",
    cursoFormacion: "COCINA BÁSICA",
    tecnicoLaboral: "María Díaz",
    nombre: "JUAN CARLOS",
    apellidos: "RIVERA MARTÍN",
    dniNie: "50991234Z",
    nss: "15 66778899 06",
    fechaNacimiento: "1990-06-20",
    edad: 35,
    distrito: "Latina",
    telefono: "600678901",
    email: "juan.rivera@example.com",
    permisoTrabajo: "Sí",
    situacionLaboral: "Mejora empleo",
    discapacidad: "No",
    certificadoVulnerabilidad: "No",
    cv: "Sí",
    formacion: "ESO",
    practicas: "Sí (Escuela Taller)",
    disponibilidadPracticas: "Parcial",
    observaciones: "Disponible fines de semana.",
    trabajando: "Sí",
    hanTrabajado: "Sí",
    propuestas: [
      { empleo: "Ayudante de cocina", fecha: "2025-08-01", aceptacion: "Sí" },
      { empleo: "Cocinero/a de producción", fecha: "2025-10-20", aceptacion: "Pendiente" },
    ],
    inserciones: [
      {
        sector: "Hostelería",
        puesto: "Ayudante cocina",
        empresa: "Bar La Plaza",
        tipoContrato: "Temporal",
        jornada: "Parcial",
        diasTrabajados: 45,
        fechaInicio: "2025-09-01",
        fechaFin: "2025-10-15",
      },
    ],
  },
};

function YesNoChip({ v }: { v: string }) {
  const lower = typeof v === "string" ? v.toLowerCase() : "";
  const yes = lower.startsWith("s"); // "sí" / "si"
  const color = yes ? "success" : lower.startsWith("e") ? "warning" : "default";
  return <Chip size="small" color={color as any} variant={yes ? "filled" : "outlined"} label={v} />;
}

function FormRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 0.5 }}>
      <Grid item xs={12} sm={5} md={4}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={7} md={8}>
        <Typography variant="body2" component="div">{value || "-"}</Typography>
      </Grid>
    </Grid>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const student = STUDENTS[String(id ?? "")];
  const [proposalsOpen, setProposalsOpen] = useState(false);


  if (!student) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Alumno no encontrado
        </Typography>
        <Button component={RouterLink} to="/students" sx={{ mt: 1 }}>
          Volver a alumnos
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">{student.nombre} {student.apellidos}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <YesNoChip v={student.trabajando} />
            <Chip size="small" label={`CV: ${student.cv}`} />
          </Stack>
        </Box>
        <Button component={RouterLink} to="/students">Volver</Button>
      </Stack>

      {/* Sección 1 - DATOS PERSONALES */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          DATOS PERSONALES
        </Typography>
                <FormRow label="Nº EXPEDIENTE" value={student.expediente} />
        <FormRow label="CURSO FORMACIÓN" value={student.cursoFormacion} />
        <FormRow label="TECNICO LABORAL" value={student.tecnicoLaboral} />
        <FormRow label="NOMBRE" value={student.nombre} />
        <FormRow label="APELLIDOS" value={student.apellidos} />
        <FormRow label="DNI / NIE" value={student.dniNie} />
        <FormRow label="Nº SEGURIDAD SOCIAL" value={student.nss} />
        <FormRow label="FECHA NACIMIENTO" value={student.fechaNacimiento} />
        <FormRow label="EDAD" value={student.edad} />
        <FormRow label="DISTRITO" value={student.distrito} />
        <FormRow label="TLF CONTACTO" value={student.telefono} />
        <FormRow label="E-MAIL" value={student.email} />
      </Paper>

      {/* Sección 2 - DATOS LABORALES */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          DATOS LABORALES
        </Typography>
        <FormRow label="SITUACION LABORAL" value={student.situacionLaboral} />
        <FormRow label="DISCAPACIDAD" value={<YesNoChip v={student.discapacidad} />} />
        <FormRow label="TIPO DE DISCAPACIDAD" value={student.tipoDiscapacidad || "-"} />
        <FormRow label="CERTIFICADO VULNERABILIDAD SOCIAL" value={<YesNoChip v={student.certificadoVulnerabilidad} />} />
        <FormRow label="CV" value={<YesNoChip v={student.cv} />} />
        <FormRow label="DISPONIBILIDAD PRACTICAS" value={student.disponibilidadPracticas} />
        <FormRow label="OBSERVACIONES" value={student.observaciones || "-"} />
      </Paper>

      {/* Sección 3 - PROPUESTAS LABORALES */}
      <Paper sx={{ p: 2, mb: 2 }} >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">PRÁCTICAS NO LABORABLES</Typography>
          <Button variant="outlined" component={RouterLink} to={`/students/${student.id}/practicas`}>
            VER PRÁCTICAS NO LABORABLES
          </Button>
        </Stack>
      </Paper>

      {/* Sección 4 - PROPUESTAS LABORALES */}
      <Paper sx={{ p: 2, mb: 2 }} >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">PROPUESTAS LABORALES</Typography>
          <Button variant="outlined" onClick={() => setProposalsOpen(true)} >
            Ver propuestas
          </Button>
        </Stack>
      </Paper>
      {/* Sección 4 - INSERCIÓN LABORAL */}
      <Paper sx={{ p: 2 }} >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1">INSERCIÓN LABORAL</Typography>
          <Button variant="outlined" component={RouterLink} to={`/students/${student.id}/inserciones`} >
            VER INSERCIONES
          </Button>
        </Stack>
      </Paper>

      {/* Diálogos de listas */}
      <Dialog open={proposalsOpen} onClose={() => setProposalsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Propuestas laborales</DialogTitle>
        <DialogContent dividers>
          {student.propuestas.length ? (
            <List dense>
              {student.propuestas.map((p, i) => (
                <ListItem key={i} disableGutters>
                  <ListItemText
                    primary={`${p.empleo}`}
                    secondary={`Fecha: ${p.fecha} — Aceptación: ${p.aceptacion}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Sin propuestas registradas</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProposalsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
