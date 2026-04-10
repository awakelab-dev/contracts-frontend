import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import api from "../lib/api";
import { fetchDistricts, fetchMunicipalities } from "../api/locations";
import type { Company, Interview, LocationDistrict, LocationMunicipality, Student, Vacancy } from "../types";
import { scoreColor } from "../utils/MatchingEngine";
import { calculateAgeFromBirthDate, formatDateDMY } from "../utils/date";
import DateTextField from "../components/DateTextField";

type EnrolledItineraryCourse = {
  expediente: string;
  course_code: string;
  dni_nie: string;
  leave_date?: string | null;
  leave_reason?: string | null;
  leave_notification?: string | null;
  course_status?: string | null;
  itinerary_name: string;
  formation_start_date?: string | null;
  formation_end_date?: string | null;
  formation_schedule?: string | null;
  company?: string | null;
  teacher?: string | null;
};

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

type PracticeRow = {
  id: number;
  expediente: string;
  student_id: number;
  course_code?: string | null;
  itinerary_name?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  company_name_resolved?: string | null;
  workplace?: string | null;
  does_practices?: string | null;
  conditions_for_practice?: string | null;
  practice_shift?: string | null;
  observations?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  schedule?: string | null;
  attendance_days?: number | null;
  evaluation?: string | null;
  practice_status?: string | null;
  leave_date?: string | null;
};

type HiringContractRow = {
  id: number;
  student_id: number;
  company_nif: string;
  company_name: string;
  sector?: string | null;
  start_date: string;
  end_date?: string | null;
  workday_pct?: string | null;
  contribution_group?: string | null;
  contract_type?: string | null;
  weekly_hours?: number | null;
  contributed_days?: number | null;
  notes?: string | null;
};

type MatchingVacancyApiRow = Vacancy & {
  score: number;
  matched_topics_count: number;
};

type EnrolledCourseForm = {
  expediente: string;
  course_code: string;
  itinerary_name: string;
  formation_start_date: string;
  formation_end_date: string;
  formation_schedule: string;
  company: string;
  teacher: string;
  course_status: "APTO" | "NO APTO" | "INSERCION";
  leave_date: string;
  leave_reason: "" | "ABANDONO" | "INSERCION" | "EXPULSION" | "ENFERMEDAD" | "OTROS";
  leave_notification: "" | "NOTIFICADA" | "FIRMADA" | "EXPULSION";
};

const CONTRACT_TYPE_OPTIONS = ["Indefinido", "Duración Determinada", "Temporal"] as const;
const WORKDAY_OPTIONS = ["Tiempo Completo", "Tiempo Parcial", "Fijo Discontínuo"] as const;
const CONTRIBUTION_GROUP_OPTIONS = [
  "INGENIEROS Y LICENCIADOS  DE ALTA DIRECCIÓN",
  "INGENIEROS TÉCNICOS, PERITOS Y AYUDANTES TITULADOS",
  "JEFES ADMINISTRATIVOS Y DE TALLER",
  "AYUDANTES NO TITULADOS",
  "OFICIALES ADMINISTRATIVOS",
  "SUBALTERNOS",
  "AUXILIARES ADMINISTRATIVOS",
  "OFICIALES DE PRIMERA Y SEGUNDA",
  "OFICIALES DE TERCERA Y ESPECIALISTAS",
  "PEONES",
  "TRABAJADORES MENORES DE DIECIOCHO AÑOS, CUALQUIERA QUE SEA SU CATEGORÍA PROFESIONAL",
] as const;
const COURSE_STATUS_OPTIONS: Array<EnrolledCourseForm["course_status"]> = ["APTO", "NO APTO", "INSERCION"];
const LEAVE_REASON_OPTIONS: Array<EnrolledCourseForm["leave_reason"]> = [
  "",
  "ABANDONO",
  "INSERCION",
  "EXPULSION",
  "ENFERMEDAD",
  "OTROS",
];
const LEAVE_NOTIFICATION_OPTIONS: Array<EnrolledCourseForm["leave_notification"]> = [
  "",
  "NOTIFICADA",
  "FIRMADA",
  "EXPULSION",
];
const PRACTICE_STATE_OPTIONS = ["SI", "NO", "INSERCION", "ACTUALIZAR"] as const;
const PRACTICE_STATUS_OPTIONS = [
  "",
  "FINALIZADAS",
  "INTERRUMPIDAS",
  "NO REALIZA PRACTICAS",
  "NO APTO FORMACION",
  "INSERCION FORMACION",
] as const;

type InvitationFormMode = "create" | "edit";
type ContractFormMode = "create" | "edit";

const EMPTY_INVITATION_FORM = {
  vacancy_id: "",
  status: "sent" as InvitationRow["status"],
  sent_at: "",
  responded_at: "",
};

const EMPTY_CONTRACT_FORM = {
  company_nif: "",
  company_name: "",
  sector: "",
  start_date: "",
  end_date: "",
  workday_pct: "",
  contribution_group: "",
  contract_type: "",
  weekly_hours: "",
  contributed_days: "",
  notes: "",
};
const EMPTY_PRACTICE_FORM = {
  expediente: "",
  company_name: "",
  workplace: "",
  does_practices: "NO" as (typeof PRACTICE_STATE_OPTIONS)[number],
  conditions_for_practice: "",
  practice_shift: "",
  observations: "",
  start_date: "",
  end_date: "",
  attendance_days: "",
  schedule: "",
  evaluation: "",
  practice_status: "" as (typeof PRACTICE_STATUS_OPTIONS)[number],
  leave_date: "",
};
const EMPTY_ENROLLED_COURSE_FORM: EnrolledCourseForm = {
  expediente: "",
  course_code: "",
  itinerary_name: "",
  formation_start_date: "",
  formation_end_date: "",
  formation_schedule: "",
  company: "",
  teacher: "",
  course_status: "APTO",
  leave_date: "",
  leave_reason: "",
  leave_notification: "",
};

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function parseCode(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}


function sexText(s: unknown): string {
  switch ((s ?? "").toString().toLowerCase()) {
    case "mujer":
      return "Mujer";
    case "hombre":
      return "Hombre";
    case "other":
      return "Otro";
    default:
      return "Desconocido";
  }
}

function courseStatusText(value: unknown): string {
  const status = (value ?? "").toString().trim().toUpperCase();
  if (!status || status === "APTO") return "APTO";
  if (status === "NOAPTO" || status === "NO APTO") return "NO APTO";
  if (status === "INSERCION") return "INSERCIÓN";
  return status;
}

function leaveReasonText(value: unknown): string {
  const reason = (value ?? "").toString().trim().toUpperCase();
  if (!reason) return "-";
  if (reason === "INSERCION") return "INSERCIÓN";
  if (reason === "EXPULSION") return "EXPULSIÓN";
  return reason;
}

function leaveNotificationText(value: unknown): string {
  const notification = (value ?? "").toString().trim().toUpperCase();
  if (!notification) return "-";
  if (notification === "EXPULSION") return "EXPULSIÓN";
  return notification;
}

function practiceStateText(value: unknown): string {
  const state = (value ?? "").toString().trim().toUpperCase();
  if (!state) return "-";
  if (state === "INSERCION") return "INSERCIÓN";
  return state;
}

function practiceStatusText(value: unknown): string {
  const status = (value ?? "").toString().trim().toUpperCase();
  if (!status) return "-";
  if (status === "INSERCION FORMACION") return "INSERCIÓN FORMACIÓN";
  return status;
}

function hasLeaveData(course: EnrolledItineraryCourse): boolean {
  return Boolean(
    (course.leave_date ?? "").toString().trim() ||
      (course.leave_reason ?? "").toString().trim() ||
      (course.leave_notification ?? "").toString().trim()
  );
}

function leaveDataSummary(course: EnrolledItineraryCourse): string {
  const parts: string[] = [];
  if ((course.leave_date ?? "").toString().trim()) {
    parts.push(`Fecha baja: ${formatDateDMY(course.leave_date)}`);
  }
  if ((course.leave_reason ?? "").toString().trim()) {
    parts.push(`Motivo: ${leaveReasonText(course.leave_reason)}`);
  }
  if ((course.leave_notification ?? "").toString().trim()) {
    parts.push(`Baja: ${leaveNotificationText(course.leave_notification)}`);
  }
  return parts.join(" · ");
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

function interviewStatusChip(s: Interview["status"]) {
  switch (s) {
    case "attended":
      return <Chip label="Asistida" color="success" size="small" />;
    case "no_show":
      return <Chip label="No asistió" color="warning" size="small" />;
    case "sent":
    default:
      return <Chip label="Enviada" size="small" />;
  }
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 160 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1 }}>{children}</Box>
    </Stack>
  );
}

type DonutSlice = { label: string; value: number; color: string };

function DonutChart({ slices, size = 84, thickness = 14 }: { slices: DonutSlice[]; size?: number; thickness?: number }) {
  const total = slices.reduce((acc, s) => acc + (Number.isFinite(s.value) ? s.value : 0), 0);

  if (total <= 0) {
    return (
      <Box sx={{ position: "relative", width: size, height: size }}>
        <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: "divider" }} />
        <Box
          sx={{
            position: "absolute",
            inset: thickness,
            borderRadius: "50%",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            0
          </Typography>
        </Box>
      </Box>
    );
  }

  let acc = 0;
  const segments = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    });

  const background = `conic-gradient(${segments.join(", ")})`;

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <Box sx={{ width: size, height: size, borderRadius: "50%", background }} />
      <Box
        sx={{
          position: "absolute",
          inset: thickness,
          borderRadius: "50%",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
          {total}
        </Typography>
      </Box>
    </Box>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo = (location.state as any)?.from;
  const handleBack = () => {
    if (typeof backTo === "string" && backTo.startsWith("/")) navigate(backTo);
    else if (location.key !== "default") navigate(-1);
    else navigate("/students");
  };

  const [student, setStudent] = useState<Student | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [recommended, setRecommended] = useState<Array<{ vacancy: Vacancy; score: number }>>([]);

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledItineraryCourse[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [practiceRows, setPracticeRows] = useState<PracticeRow[]>([]);
  const [contracts, setContracts] = useState<HiringContractRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  // Student editing
  const [editingStudent, setEditingStudent] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [districtOptions, setDistrictOptions] = useState<LocationDistrict[]>([]);
  const [municipalityOptions, setMunicipalityOptions] = useState<LocationMunicipality[]>([]);
  const [studentDraft, setStudentDraft] = useState({
    first_names: "",
    last_names: "",
    dni_nie: "",
    social_security_number: "",
    birth_date: "",
    sex: "unknown" as "mujer" | "hombre" | "other" | "unknown",
    district_code: "",
    municipality_code: "",
    phone: "",
    email: "",
    notes: "",
  });

  // Dialogs
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [interviewsOpen, setInterviewsOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [practicesOpen, setPracticesOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);

  // Enrolled itinerary form (update)
  const [enrolledCourseForm, setEnrolledCourseForm] = useState<EnrolledCourseForm>(
    EMPTY_ENROLLED_COURSE_FORM
  );
  const [enrolledCourseSaving, setEnrolledCourseSaving] = useState(false);

  // Interviews form
  const [interviewForm, setInterviewForm] = useState<{
    id?: number;
    interview_date: string;
    status: "sent" | "attended" | "no_show";
    place: string;
    notes: string;
  }>({
    interview_date: "",
    status: "sent",
    place: "",
    notes: "",
  });
  const [interviewSaving, setInterviewSaving] = useState(false);

  // Invitations form
  const [invitationForm, setInvitationForm] = useState<{
    id?: number;
    vacancy_id: string;
    status: InvitationRow["status"];
    sent_at: string;
    responded_at: string;
  }>({ ...EMPTY_INVITATION_FORM });
  const [invitationFormMode, setInvitationFormMode] = useState<InvitationFormMode | null>(null);
  const [invitationSaving, setInvitationSaving] = useState(false);
  const [invitationNotify, setInvitationNotify] = useState({ email: false, whatsapp: false });

  // Practices form
  const [practiceForm, setPracticeForm] = useState<{
    id?: number;
    expediente: string;
    company_name: string;
    workplace: string;
    does_practices: (typeof PRACTICE_STATE_OPTIONS)[number];
    conditions_for_practice: string;
    practice_shift: string;
    observations: string;
    start_date: string;
    end_date: string;
    attendance_days: string;
    schedule: string;
    evaluation: string;
    practice_status: (typeof PRACTICE_STATUS_OPTIONS)[number];
    leave_date: string;
  }>({ ...EMPTY_PRACTICE_FORM });
  const [practiceSaving, setPracticeSaving] = useState(false);

  // Hiring contracts form
  const [contractForm, setContractForm] = useState<{
    id?: number;
    company_nif: string;
    company_name: string;
    sector: string;
    start_date: string;
    end_date: string;
    workday_pct: string;
    contribution_group: string;
    contract_type: string;
    weekly_hours: string;
    contributed_days: string;
    notes: string;
  }>({ ...EMPTY_CONTRACT_FORM });
  const [contractFormMode, setContractFormMode] = useState<ContractFormMode | null>(null);
  const [contractSaving, setContractSaving] = useState(false);

  const sid = String(id ?? "").trim();
  const studentDraftAge = useMemo(() => calculateAgeFromBirthDate(studentDraft.birth_date), [studentDraft.birth_date]);

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    companies.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const districtNameByCode = useMemo(() => {
    const m = new Map<number, string>();
    districtOptions.forEach((district) => m.set(district.code, district.name));
    return m;
  }, [districtOptions]);

  const municipalityNameByCode = useMemo(() => {
    const m = new Map<number, string>();
    municipalityOptions.forEach((municipality) => m.set(municipality.code, municipality.name));
    return m;
  }, [municipalityOptions]);

  const itineraryCoursesSummary = useMemo(() => enrolledCourses.slice(0, 4), [enrolledCourses]);
  const totalCoursesCount = enrolledCourses.length;

  const recommendedTop2 = useMemo(() => recommended.slice(0, 2), [recommended]);

  const interviewsSent = useMemo(
    () => interviews.filter((i) => (i.status ?? "sent") === "sent").length,
    [interviews]
  );

  const interviewsAttended = useMemo(
    () => interviews.filter((i) => (i.status ?? "sent") === "attended").length,
    [interviews]
  );

  const interviewsNoShow = useMemo(
    () => interviews.filter((i) => (i.status ?? "sent") === "no_show").length,
    [interviews]
  );

  const invitationsAccepted = useMemo(
    () => invitations.filter((inv) => inv.status === "accepted").length,
    [invitations]
  );

  const practiceSorted = useMemo(() => {
    return [...practiceRows].sort((a, b) => fmtDate(b.start_date).localeCompare(fmtDate(a.start_date)));
  }, [practiceRows]);

  const contractsSorted = useMemo(() => {
    return [...contracts].sort((a, b) => fmtDate(b.start_date).localeCompare(fmtDate(a.start_date)));
  }, [contracts]);

  const practiceSummary = useMemo(() => practiceSorted.slice(0, 3), [practiceSorted]);
  const contractsSummary = useMemo(() => contractsSorted.slice(0, 3), [contractsSorted]);

  const interviewsChartSlices = useMemo<DonutSlice[]>(
    () => [
      { label: "Enviadas", value: interviewsSent, color: "#1976d2" },
      { label: "Asistidas", value: interviewsAttended, color: "#2e7d32" },
      { label: "No asistió", value: interviewsNoShow, color: "#ed6c02" },
    ],
    [interviewsAttended, interviewsNoShow, interviewsSent]
  );

  const invitationsChartSlices = useMemo<DonutSlice[]>(
    () => [
      { label: "Generaron entrevista", value: invitationsAccepted, color: "#2e7d32" },
      { label: "Otras", value: Math.max(0, invitations.length - invitationsAccepted), color: "#1976d2" },
    ],
    [invitations.length, invitationsAccepted]
  );

  async function fetchAll(currentSid: string) {
    const n = Number(currentSid);
    const [sRes, vRes, cRes, iRes, ecRes, invRes, practicesRes, hcRes, mRes] = await Promise.all([
      api.get<Student>(`/students/${currentSid}`),
      api.get<Vacancy[]>(`/vacancies`),
      api.get<Company[]>(`/companies`),
      api.get<Interview[]>(`/interviews`, { params: { student_id: n } }),
      api.get<EnrolledItineraryCourse[]>(`/students/${currentSid}/enrolled-courses`),
      api.get<InvitationRow[]>(`/invitations`, { params: { student_id: n } }),
      api.get<PracticeRow[]>(`/practices`, { params: { student_id: n } }),
      api.get<HiringContractRow[]>(`/hiring-contracts`, { params: { student_id: n } }),
      api.get<MatchingVacancyApiRow[]>(`/matching/vacancies`, { params: { studentId: n, limit: 500 } }),
    ]);

    const rec = Array.isArray(mRes.data) ? mRes.data : [];

    return {
      student: sRes.data,
      vacancies: Array.isArray(vRes.data) ? vRes.data : [],
      companies: Array.isArray(cRes.data) ? cRes.data : [],
      interviews: Array.isArray(iRes.data) ? iRes.data : [],
      enrolledCourses: Array.isArray(ecRes.data) ? ecRes.data : [],
      invitations: Array.isArray(invRes.data) ? invRes.data : [],
      practiceRows: Array.isArray(practicesRes.data) ? practicesRes.data : [],
      contracts: Array.isArray(hcRes.data) ? hcRes.data : [],
      recommended: rec
        .map((v) => ({ vacancy: v, score: Number((v as any).score) }))
        .filter((x) => Number.isFinite(x.score) && x.score >= 50),
    };
  }

  useEffect(() => {
    let cancel = false;
    fetchMunicipalities()
      .then((rows) => {
        if (cancel) return;
        setMunicipalityOptions(rows);
      })
      .catch(() => {
        if (cancel) return;
        setMunicipalityOptions([]);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!studentDraft.municipality_code) {
      setDistrictOptions([]);
      return;
    }

    let cancel = false;
    fetchDistricts(studentDraft.municipality_code)
      .then((rows) => {
        if (cancel) return;
        setDistrictOptions(rows);
      })
      .catch(() => {
        if (cancel) return;
        setDistrictOptions([]);
      });
    return () => {
      cancel = true;
    };
  }, [studentDraft.municipality_code]);

  useEffect(() => {
    if (!sid) return;
    let cancel = false;
    setLoading(true);
    setNotFound(false);
    setLoadError(null);
    setActionError(null);
    setActionInfo(null);

    fetchAll(sid)
      .then((data) => {
        if (cancel) return;
        setStudent(data.student);
        setVacancies(data.vacancies);
        setCompanies(data.companies);
        setInterviews(data.interviews);
        setEnrolledCourses(data.enrolledCourses);
        setInvitations(data.invitations);
        setPracticeRows(data.practiceRows);
        setContracts(data.contracts);
        setRecommended(data.recommended);
      })
      .catch((err) => {
        if (cancel) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setLoadError(err?.response?.data?.message || err?.message || "Error");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [sid]);

  useEffect(() => {
    if (!student) return;
    setStudentDraft({
      first_names: student.first_names || "",
      last_names: student.last_names || "",
      dni_nie: student.dni_nie || "",
      social_security_number: student.social_security_number || "",
      birth_date: fmtDate(student.birth_date),
      sex: (student.sex || "unknown") as any,
      district_code: student.district_code != null ? String(student.district_code) : "",
      municipality_code: student.municipality_code != null ? String(student.municipality_code) : "",
      phone: student.phone || "",
      email: student.email || "",
      notes: student.notes || "",
    });
  }, [student]);

  async function saveStudent() {
    if (!student) return;
    const parsedDistrictCode = parseCode(studentDraft.district_code);
    const parsedMunicipalityCode = parseCode(studentDraft.municipality_code);
    try {
      setActionError(null);
      setSavingStudent(true);
      await api.put(`/students/${student.id}`, {
        first_names: studentDraft.first_names,
        last_names: studentDraft.last_names,
        dni_nie: studentDraft.dni_nie,
        social_security_number: studentDraft.social_security_number || null,
        birth_date: studentDraft.birth_date || null,
        sex: studentDraft.sex,
        district_code: parsedDistrictCode,
        municipality_code: parsedMunicipalityCode,
        phone: studentDraft.phone || null,
        email: studentDraft.email || null,
        notes: studentDraft.notes || null,
      });

      setStudent({
        ...student,
        first_names: studentDraft.first_names,
        last_names: studentDraft.last_names,
        dni_nie: studentDraft.dni_nie,
        social_security_number: studentDraft.social_security_number || null,
        birth_date: studentDraft.birth_date || null,
        sex: studentDraft.sex,
        district_code: parsedDistrictCode,
        municipality_code: parsedMunicipalityCode,
        district: parsedDistrictCode
          ? districtNameByCode.get(parsedDistrictCode) || null
          : null,
        municipality: parsedMunicipalityCode
          ? municipalityNameByCode.get(parsedMunicipalityCode) || null
          : null,
        phone: studentDraft.phone || null,
        email: studentDraft.email || null,
        notes: studentDraft.notes || null,
      });

      setEditingStudent(false);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar");
    } finally {
      setSavingStudent(false);
    }
  }

  async function refreshEnrolledCourses() {
    if (!sid) return;
    const { data } = await api.get<EnrolledItineraryCourse[]>(`/students/${sid}/enrolled-courses`);
    setEnrolledCourses(Array.isArray(data) ? data : []);
  }

  function startEditEnrolledCourse(course: EnrolledItineraryCourse) {
    setEnrolledCourseForm({
      expediente: course.expediente,
      course_code: course.course_code,
      itinerary_name: course.itinerary_name ?? "",
      formation_start_date: fmtDate(course.formation_start_date),
      formation_end_date: fmtDate(course.formation_end_date),
      formation_schedule: course.formation_schedule ?? "",
      company: course.company ?? "",
      teacher: course.teacher ?? "",
      course_status: (course.course_status === "NO APTO" || course.course_status === "INSERCION"
        ? course.course_status
        : "APTO") as EnrolledCourseForm["course_status"],
      leave_date: fmtDate(course.leave_date),
      leave_reason: (
        (course.leave_reason ?? "").toString().trim().toUpperCase() as EnrolledCourseForm["leave_reason"]
      ) || "",
      leave_notification: (
        (course.leave_notification ?? "")
          .toString()
          .trim()
          .toUpperCase() as EnrolledCourseForm["leave_notification"]
      ) || "",
    });
  }

  function resetEnrolledCourseForm() {
    setEnrolledCourseForm(EMPTY_ENROLLED_COURSE_FORM);
  }

  async function saveEnrolledCourse() {
    if (!sid || !enrolledCourseForm.expediente) return;
    try {
      setActionError(null);
      setEnrolledCourseSaving(true);
      await api.put(
        `/students/${sid}/enrolled-courses/${encodeURIComponent(enrolledCourseForm.expediente)}`,
        {
          course_status: enrolledCourseForm.course_status,
          leave_date: enrolledCourseForm.leave_date || null,
          leave_reason: enrolledCourseForm.leave_reason || null,
          leave_notification: enrolledCourseForm.leave_notification || null,
        }
      );
      await refreshEnrolledCourses();
      resetEnrolledCourseForm();
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar itinerario");
    } finally {
      setEnrolledCourseSaving(false);
    }
  }

  const toIntOrNull = (v: string) => {
    const s = (v ?? "").toString().trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  async function refreshInterviews() {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const { data } = await api.get<Interview[]>(`/interviews`, { params: { student_id: n } });
    setInterviews(Array.isArray(data) ? data : []);
  }

  async function refreshInvitations() {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const { data } = await api.get<InvitationRow[]>(`/invitations`, { params: { student_id: n } });
    setInvitations(Array.isArray(data) ? data : []);
  }

  async function refreshPractices() {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const { data } = await api.get<PracticeRow[]>(`/practices`, { params: { student_id: n } });
    setPracticeRows(Array.isArray(data) ? data : []);
  }

  async function refreshContracts() {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const { data } = await api.get<HiringContractRow[]>(`/hiring-contracts`, { params: { student_id: n } });
    setContracts(Array.isArray(data) ? data : []);
  }

  async function saveInterview() {
    const n = Number(sid);
    if (!Number.isFinite(n) || !interviewForm.interview_date) return;

    try {
      setActionError(null);
      setInterviewSaving(true);

      if (interviewForm.id) {
        await api.put(`/interviews/${interviewForm.id}`, {
          place: interviewForm.place || null,
          interview_date: interviewForm.interview_date,
          status: interviewForm.status,
          notes: interviewForm.notes || null,
        });
      } else {
        await api.post(`/interviews`, {
          student_id: n,
          place: interviewForm.place || null,
          interview_date: interviewForm.interview_date,
          status: interviewForm.status,
          notes: interviewForm.notes || null,
        });
      }

      await refreshInterviews();
      setInterviewForm({ interview_date: "", status: "sent", place: "", notes: "" });
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar entrevista");
    } finally {
      setInterviewSaving(false);
    }
  }

  async function deleteInterview(interviewId: number) {
    try {
      setActionError(null);
      await api.delete(`/interviews/${interviewId}`);
      await refreshInterviews();
      if (interviewForm.id === interviewId) {
        setInterviewForm({ interview_date: "", status: "sent", place: "", notes: "" });
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar entrevista");
    }
  }

  function openInvitationsDialog() {
    setInvitationsOpen(true);
    setInvitationFormMode(null);
    setInvitationForm({ ...EMPTY_INVITATION_FORM });
    setInvitationNotify({ email: false, whatsapp: false });
  }

  function closeInvitationsDialog() {
    setInvitationsOpen(false);
    setInvitationFormMode(null);
    setInvitationForm({ ...EMPTY_INVITATION_FORM });
    setInvitationNotify({ email: false, whatsapp: false });
  }

  function startCreateInvitation() {
    setInvitationFormMode("create");
    setInvitationForm({
      ...EMPTY_INVITATION_FORM,
      status: "sent",
      sent_at: fmtDate(new Date()),
      responded_at: "",
    });
    setInvitationNotify({ email: false, whatsapp: false });
  }

  function startEditInvitation(inv: InvitationRow) {
    setInvitationFormMode("edit");
    setInvitationForm({
      id: inv.id,
      vacancy_id: String(inv.vacancy_id),
      status: inv.status,
      sent_at: fmtDate(inv.sent_at),
      responded_at: inv.responded_at ? fmtDate(inv.responded_at) : "",
    });
    setInvitationNotify({ email: false, whatsapp: false });
  }

  function cancelInvitationForm() {
    setInvitationFormMode(null);
    setInvitationForm({ ...EMPTY_INVITATION_FORM });
    setInvitationNotify({ email: false, whatsapp: false });
  }

  async function saveInvitation() {
    if (!invitationFormMode) return;
    const n = Number(sid);
    const vid = Number(invitationForm.vacancy_id);
    if (!Number.isFinite(n)) return;

    const isCreating = invitationFormMode === "create";
    if (isCreating && !Number.isFinite(vid)) return;
    const notify = { ...invitationNotify };

    const statusToSave: InvitationRow["status"] = isCreating ? "sent" : invitationForm.status;
    const responded_at = isCreating
      ? ""
      : invitationForm.responded_at || (["accepted", "rejected"].includes(statusToSave) ? fmtDate(new Date()) : "");

    try {
      setActionError(null);
      setInvitationSaving(true);

      if (invitationFormMode === "edit" && invitationForm.id) {
        await api.put(`/invitations/${invitationForm.id}`, {
          status: statusToSave,
          sent_at: invitationForm.sent_at || null,
          responded_at: responded_at || null,
        });
      } else {
        await api.post(`/invitations`, {
          vacancy_id: vid,
          student_id: n,
          status: statusToSave,
          sent_at: invitationForm.sent_at || null,
          responded_at: null,
        });
      }

      await refreshInvitations();
      cancelInvitationForm();

      if (isCreating && (notify.email || notify.whatsapp)) {
        const channels = [notify.email ? "Email" : null, notify.whatsapp ? "WhatsApp" : null].filter(Boolean).join(" + ");
        setActionInfo(`Invitación guardada. Notificar por ${channels} (pendiente de integración).`);
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar invitación");
    } finally {
      setInvitationSaving(false);
    }
  }

  async function deleteInvitation(invitationId: number) {
    try {
      setActionError(null);
      await api.delete(`/invitations/${invitationId}`);
      await refreshInvitations();
      if (invitationForm.id === invitationId) {
        cancelInvitationForm();
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar invitación");
    }
  }

  function startCreatePractice() {
    setPracticeForm({
      ...EMPTY_PRACTICE_FORM,
      expediente: enrolledCourses[0]?.expediente ?? "",
    });
  }

  function startEditPractice(p: PracticeRow) {
    setPracticeForm({
      id: p.id,
      expediente: p.expediente ?? "",
      company_name: p.company_name ?? "",
      workplace: p.workplace ?? "",
      does_practices:
        (p.does_practices &&
        (PRACTICE_STATE_OPTIONS as readonly string[]).includes(
          p.does_practices.toString().trim().toUpperCase()
        )
          ? p.does_practices.toString().trim().toUpperCase()
          : "NO") as (typeof PRACTICE_STATE_OPTIONS)[number],
      conditions_for_practice: p.conditions_for_practice ?? "",
      practice_shift: p.practice_shift ?? "",
      observations: p.observations ?? "",
      start_date: fmtDate(p.start_date),
      end_date: fmtDate(p.end_date),
      attendance_days: p.attendance_days != null ? String(p.attendance_days) : "",
      schedule: p.schedule ?? "",
      evaluation: p.evaluation ?? "",
      practice_status:
        (p.practice_status &&
        (PRACTICE_STATUS_OPTIONS as readonly string[]).includes(
          p.practice_status.toString().trim().toUpperCase()
        )
          ? p.practice_status.toString().trim().toUpperCase()
          : "") as (typeof PRACTICE_STATUS_OPTIONS)[number],
      leave_date: fmtDate(p.leave_date),
    });
  }

  async function savePractice() {
    const n = Number(sid);
    if (!Number.isFinite(n) || !practiceForm.expediente.trim()) return;

    try {
      setActionError(null);
      setPracticeSaving(true);

      const payload = {
        student_id: n,
        expediente: practiceForm.expediente.trim().toUpperCase(),
        company_name: practiceForm.company_name || null,
        workplace: practiceForm.workplace || null,
        does_practices: practiceForm.does_practices,
        conditions_for_practice: practiceForm.conditions_for_practice || null,
        practice_shift: practiceForm.practice_shift || null,
        observations: practiceForm.observations || null,
        start_date: practiceForm.start_date || null,
        end_date: practiceForm.end_date || null,
        attendance_days: toIntOrNull(practiceForm.attendance_days),
        schedule: practiceForm.schedule || null,
        evaluation: practiceForm.evaluation || null,
        practice_status: practiceForm.practice_status || null,
        leave_date: practiceForm.leave_date || null,
      };

      if (practiceForm.id) {
        await api.put(`/practices/${practiceForm.id}`, payload);
      } else {
        await api.post(`/practices`, payload);
      }

      await refreshPractices();
      setPracticeForm({
        ...EMPTY_PRACTICE_FORM,
        expediente: practiceForm.expediente || enrolledCourses[0]?.expediente || "",
      });
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar práctica");
    } finally {
      setPracticeSaving(false);
    }
  }

  async function deletePractice(practiceId: number) {
    try {
      setActionError(null);
      await api.delete(`/practices/${practiceId}`);
      await refreshPractices();
      if (practiceForm.id === practiceId) {
        setPracticeForm({
          ...EMPTY_PRACTICE_FORM,
          expediente: enrolledCourses[0]?.expediente || "",
        });
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar práctica");
    }
  }

  function openContractsDialog() {
    setContractsOpen(true);
    setContractFormMode(null);
    setContractForm({ ...EMPTY_CONTRACT_FORM });
  }

  function closeContractsDialog() {
    setContractsOpen(false);
    setContractFormMode(null);
    setContractForm({ ...EMPTY_CONTRACT_FORM });
  }

  function startCreateContract() {
    setContractFormMode("create");
    setContractForm({ ...EMPTY_CONTRACT_FORM });
  }

  function startEditContract(c: HiringContractRow) {
    setContractFormMode("edit");
    setContractForm({
      id: c.id,
      company_nif: c.company_nif,
      company_name: c.company_name,
      sector: c.sector ?? "",
      start_date: fmtDate(c.start_date),
      end_date: fmtDate(c.end_date),
      workday_pct: c.workday_pct ?? "",
      contribution_group: c.contribution_group ?? "",
      contract_type: c.contract_type ?? "",
      weekly_hours: c.weekly_hours != null ? String(c.weekly_hours) : "",
      contributed_days: c.contributed_days != null ? String(c.contributed_days) : "",
      notes: c.notes ?? "",
    });
  }

  function cancelContractForm() {
    setContractFormMode(null);
    setContractForm({ ...EMPTY_CONTRACT_FORM });
  }

  async function saveContract() {
    if (!contractFormMode) return;
    const n = Number(sid);
    if (!Number.isFinite(n) || !contractForm.company_nif.trim() || !contractForm.company_name.trim() || !contractForm.start_date) return;

    try {
      setActionError(null);
      setContractSaving(true);

      const payload = {
        student_id: n,
        company_nif: contractForm.company_nif,
        company_name: contractForm.company_name,
        sector: contractForm.sector || null,
        start_date: contractForm.start_date,
        end_date: contractForm.end_date || null,
        workday_pct: contractForm.workday_pct || null,
        contribution_group: contractForm.contribution_group || null,
        contract_type: contractForm.contract_type || null,
        weekly_hours: toIntOrNull(contractForm.weekly_hours),
        contributed_days: toIntOrNull(contractForm.contributed_days),
        notes: contractForm.notes || null,
      };

      if (contractFormMode === "edit" && contractForm.id) {
        await api.put(`/hiring-contracts/${contractForm.id}`, payload);
      } else {
        await api.post(`/hiring-contracts`, payload);
      }

      await refreshContracts();
      cancelContractForm();
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar contrato");
    } finally {
      setContractSaving(false);
    }
  }

  async function deleteContract(contractId: number) {
    try {
      setActionError(null);
      await api.delete(`/hiring-contracts/${contractId}`);
      await refreshContracts();
      if (contractForm.id === contractId) {
        cancelContractForm();
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar contrato");
    }
  }

  if (loading) return <Typography sx={{ p: 3 }}>Cargando datos del alumno…</Typography>;

  if (notFound)
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Alumno no encontrado (404)</Typography>
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver
        </Button>
      </Box>
    );

  if (loadError)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {loadError}</Typography>
        <Button onClick={handleBack} sx={{ mt: 1 }}>
          Volver
        </Button>
      </Box>
    );

  if (!student) return null;

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1}>
        <Stack>
          <Typography variant="h5">{`${student.first_names} ${student.last_names}`.trim()}</Typography>
          <Typography variant="body2" color="text.secondary">
            DNI / NIE / Pasaporte: {student.dni_nie || "-"}
          </Typography>
        </Stack>
        <Button onClick={handleBack}>Volver</Button>
      </Stack>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {actionInfo && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setActionInfo(null)}>
          {actionInfo}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Stack spacing={2}>
            {/* Datos alumno + Vacantes recomendadas */}
            <Grid container spacing={2} alignItems="stretch">
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex" }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Datos del alumno
                    </Typography>
                    {!editingStudent ? (
                      <Button size="small" variant="outlined" onClick={() => setEditingStudent(true)}>
                        Editar
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" onClick={saveStudent} disabled={savingStudent}>
                          Guardar
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingStudent(false);
                            setStudentDraft({
                              first_names: student.first_names || "",
                              last_names: student.last_names || "",
                              dni_nie: student.dni_nie || "",
                              social_security_number: student.social_security_number || "",
                              birth_date: fmtDate(student.birth_date),
                              sex: (student.sex || "unknown") as any,
                              district_code: student.district_code != null ? String(student.district_code) : "",
                              municipality_code: student.municipality_code != null ? String(student.municipality_code) : "",
                              phone: student.phone || "",
                              email: student.email || "",
                              notes: student.notes || "",
                            });
                          }}
                        >
                          Cancelar
                        </Button>
                      </Stack>
                    )}
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  <Stack spacing={1}>

                    <InfoRow label="Nombres">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.first_names}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, first_names: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.first_names}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Apellidos">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.last_names}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, last_names: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.last_names}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="DNI / NIE / Pasaporte">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.dni_nie}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, dni_nie: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.dni_nie}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Nº Seguridad Social">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.social_security_number}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, social_security_number: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.social_security_number ?? "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Fecha nacimiento">
                      {editingStudent ? (
                        <DateTextField
                          size="small"
                          value={studentDraft.birth_date}
                          onChange={(nextIso) => setStudentDraft((d) => ({ ...d, birth_date: nextIso }))}
                          fullWidth
                          placeholder="dd/mm/aaaa"
                        />
                      ) : (
                        <Typography variant="body2">{formatDateDMY(student.birth_date)}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Edad">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraftAge != null ? String(studentDraftAge) : ""}
                          InputProps={{ readOnly: true }}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{calculateAgeFromBirthDate(student.birth_date) ?? "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Sexo">
                      {editingStudent ? (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={studentDraft.sex}
                          onChange={(e) =>
                            setStudentDraft((d) => ({
                              ...d,
                              sex: e.target.value as any,
                            }))
                          }
                        >
                          <MenuItem value="mujer">Mujer</MenuItem>
                          <MenuItem value="hombre">Hombre</MenuItem>
                          <MenuItem value="other">Otro</MenuItem>
                          {studentDraft.sex === "unknown" && (
                            <MenuItem value="unknown" disabled>
                              Desconocido
                            </MenuItem>
                          )}
                        </TextField>
                      ) : (
                        <Typography variant="body2">{sexText(student.sex)}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Municipio">
                      {editingStudent ? (
                        <TextField
                          select
                          size="small"
                          value={studentDraft.municipality_code}
                          onChange={(e) =>
                            setStudentDraft((d) => ({
                              ...d,
                              municipality_code: e.target.value,
                              district_code: "",
                            }))
                          }
                          fullWidth
                        >
                          <MenuItem value="">Sin municipio</MenuItem>
                          {municipalityOptions.map((municipality) => (
                            <MenuItem key={municipality.code} value={String(municipality.code)}>
                              {municipality.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Typography variant="body2">{student.municipality ?? "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Distrito">
                      {editingStudent ? (
                        <TextField
                          select
                          size="small"
                          disabled={!studentDraft.municipality_code}
                          value={studentDraft.district_code}
                          onChange={(e) =>
                            setStudentDraft((d) => ({
                              ...d,
                              district_code: e.target.value,
                            }))
                          }
                          fullWidth
                        >
                          <MenuItem value="">Sin distrito</MenuItem>
                          {districtOptions.map((district) => (
                            <MenuItem key={district.code} value={String(district.code)}>
                              {district.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <Typography variant="body2">{student.district ?? "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Teléfono">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.phone}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, phone: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.phone ?? "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Email">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          type="email"
                          value={studentDraft.email}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, email: e.target.value }))}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.email ?? "-"}</Typography>
                      )}
                    </InfoRow>


                    <InfoRow label="Observaciones">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.notes}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, notes: e.target.value }))}
                          multiline
                          minRows={2}
                          fullWidth
                        />
                      ) : (
                        <Typography variant="body2">{student.notes ?? "-"}</Typography>
                      )}
                    </InfoRow>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex" }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Vacantes recomendadas ({recommended.length})
                    </Typography>
                    {recommended.length > 2 ? (
                      <Button size="small" variant="outlined" onClick={() => setRecommendedOpen(true)}>
                        Ver todas
                      </Button>
                    ) : null}
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />

                  {recommendedTop2.length ? (
                    <Stack spacing={1.2}>
                      {recommendedTop2.map(({ vacancy, score }) => (
                        <Paper key={vacancy.id} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {vacancy.title}
                            </Typography>
                            <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                          </Stack>
                          {vacancy.description ? (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              {vacancy.description}
                            </Typography>
                          ) : null}
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {companyName.get(vacancy.company_id) || `ID #${vacancy.company_id}`} · {vacancy.sector ?? "-"}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">No hay recomendaciones para este perfil aún.</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Entrevistas + Invitaciones */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Entrevistas ({interviews.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setInterviewsOpen(true)}>
                      Ver
                    </Button>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <DonutChart slices={interviewsChartSlices} size={76} thickness={12} />
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Enviadas: {interviewsSent}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Asistidas: {interviewsAttended}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          No asistió: {interviewsNoShow}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contratos: {contracts.length}
                        </Typography>
                      </Stack>
                    </Stack>

                    {interviews.length ? (
                      <Stack spacing={1}>
                        {interviews.slice(0, 2).map((i) => (
                          <Box key={i.id}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2">{formatDateDMY(i.interview_date)}</Typography>
                              {interviewStatusChip(i.status)}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {i.place ?? "-"}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">Sin entrevistas</Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Invitaciones ({invitations.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={openInvitationsDialog}>
                      Ver
                    </Button>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <DonutChart slices={invitationsChartSlices} size={76} thickness={12} />
                      <Stack spacing={0.25} sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Enviadas: {invitations.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Generaron entrevista: {invitationsAccepted}
                        </Typography>
                      </Stack>
                    </Stack>

                    {invitations.length ? (
                      <Stack spacing={1}>
                        {invitations.slice(0, 2).map((inv) => (
                          <Box key={inv.id}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {inv.vacancy_title}
                              </Typography>
                              {statusChip(inv.status)}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {inv.company_name} · {formatDateDMY(inv.sent_at)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Typography color="text.secondary">Sin invitaciones</Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Prácticas + Contrataciones */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Prácticas no Laborales ({practiceRows.length})
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        startCreatePractice();
                        setPracticesOpen(true);
                      }}
                    >
                      Ver
                    </Button>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />
                  {practiceRows.length ? (
                    <Stack spacing={1}>
                      {practiceSummary.map((p) => (
                        <Box key={p.id}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.company_name || p.company_name_resolved || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {`${p.expediente} · ${practiceStatusText(p.practice_status)} · ${formatDateDMY(p.start_date)} → ${formatDateDMY(p.end_date)}`}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Sin prácticas registradas</Typography>
                  )}
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Contrataciones ({contracts.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={openContractsDialog}>
                      Ver
                    </Button>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />

                  {contracts.length ? (
                    <Stack spacing={1}>
                      {contractsSummary.map((c) => (
                        <Box key={c.id}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {c.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {(c.contract_type || "-") + " · " + formatDateDMY(c.start_date) + " → " + formatDateDMY(c.end_date)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Sin contratos</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* Cursos */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Cursos realizados ({totalCoursesCount})
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setCoursesOpen(true)}>
                  Ver detalles
                </Button>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />
              {itineraryCoursesSummary.length ? (
                <Stack spacing={1.5}>
                  {itineraryCoursesSummary.length > 0 && (
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Itinerarios matriculados
                      </Typography>
                      {itineraryCoursesSummary.map((course) => (
                        <Box key={course.expediente}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {course.itinerary_name || course.course_code}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {`Código: ${course.course_code} · Expediente: ${course.expediente} · Estado: ${courseStatusText(course.course_status)} · Inicio formación: ${formatDateDMY(course.formation_start_date)} · Fin formación: ${formatDateDMY(course.formation_end_date)}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {`Horario: ${course.formation_schedule || "-"} · Empresa: ${course.company || "-"} · Docente: ${course.teacher || "-"}`}
                          </Typography>
                          {hasLeaveData(course) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {leaveDataSummary(course)}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary">Sin itinerarios matriculados</Typography>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Vacantes recomendadas: listado completo */}
      <Dialog open={recommendedOpen} onClose={() => setRecommendedOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Vacantes recomendadas</DialogTitle>
        <DialogContent dividers>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vacante</TableCell>
                  <TableCell>Empresa</TableCell>
                  <TableCell>Sector</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha creación</TableCell>
                  <TableCell align="right">Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recommended.map(({ vacancy, score }) => (
                  <TableRow key={vacancy.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {vacancy.title}
                      </Typography>
                      {vacancy.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {vacancy.description}
                        </Typography>
                      ) : null}
                    </TableCell>
                    <TableCell>{companyName.get(vacancy.company_id) || `ID #${vacancy.company_id}`}</TableCell>
                    <TableCell>{vacancy.sector ?? "-"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(vacancy.created_at)}</TableCell>
                    <TableCell align="right">
                      <Chip size="small" label={`${score}%`} color={scoreColor(score)} />
                    </TableCell>
                  </TableRow>
                ))}
                {recommended.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      No hay recomendaciones
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecommendedOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Cursos: listado completo + CRUD */}
      <Dialog open={coursesOpen} onClose={() => setCoursesOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Cursos realizados</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Itinerario</TableCell>
                      <TableCell>Código curso</TableCell>
                      <TableCell>Expediente</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Fecha inicio formación</TableCell>
                      <TableCell>Fecha fin formación</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enrolledCourses.map((course) => (
                      <TableRow
                        key={course.expediente}
                        hover
                        selected={enrolledCourseForm.expediente === course.expediente}
                        sx={{ cursor: "pointer" }}
                        onClick={() => startEditEnrolledCourse(course)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") startEditEnrolledCourse(course);
                        }}
                      >
                        <TableCell>{course.itinerary_name || "-"}</TableCell>
                        <TableCell>{course.course_code}</TableCell>
                        <TableCell>{course.expediente}</TableCell>
                        <TableCell>{courseStatusText(course.course_status)}</TableCell>
                        <TableCell>{formatDateDMY(course.formation_start_date)}</TableCell>
                        <TableCell>{formatDateDMY(course.formation_end_date)}</TableCell>
                      </TableRow>
                    ))}
                    {enrolledCourses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                          Sin itinerarios matriculados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {enrolledCourseForm.expediente ? "Editar itinerario" : "Selecciona un itinerario para editar"}
              </Typography>
              {enrolledCourseForm.expediente ? (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Itinerario"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.itinerary_name || "-"}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      label="Código curso"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.course_code}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      label="Expediente"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.expediente}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Fecha inicio formación"
                      size="small"
                      fullWidth
                      value={formatDateDMY(enrolledCourseForm.formation_start_date)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Fecha fin formación"
                      size="small"
                      fullWidth
                      value={formatDateDMY(enrolledCourseForm.formation_end_date)}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Horario formación"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.formation_schedule || "-"}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Empresa"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.company || "-"}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Docente"
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.teacher || "-"}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Estado"
                      select
                      size="small"
                      fullWidth
                      value={enrolledCourseForm.course_status}
                      onChange={(e) => {
                        const nextStatus = e.target.value as EnrolledCourseForm["course_status"];
                        setEnrolledCourseForm((f) => ({
                          ...f,
                          course_status: nextStatus,
                          leave_date: nextStatus === "APTO" ? "" : f.leave_date,
                          leave_reason: nextStatus === "APTO" ? "" : f.leave_reason,
                          leave_notification: nextStatus === "APTO" ? "" : f.leave_notification,
                        }));
                      }}
                    >
                      {COURSE_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {courseStatusText(option)}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <DateTextField
                      label="Fecha baja"
                      size="small"
                      fullWidth
                      disabled={enrolledCourseForm.course_status === "APTO"}
                      value={enrolledCourseForm.leave_date}
                      onChange={(nextIso) => setEnrolledCourseForm((f) => ({ ...f, leave_date: nextIso }))}
                      placeholder="dd/mm/aaaa"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Motivo baja"
                      select
                      size="small"
                      fullWidth
                      disabled={enrolledCourseForm.course_status === "APTO"}
                      value={enrolledCourseForm.leave_reason}
                      onChange={(e) =>
                        setEnrolledCourseForm((f) => ({
                          ...f,
                          leave_reason: e.target.value as EnrolledCourseForm["leave_reason"],
                        }))
                      }
                    >
                      {LEAVE_REASON_OPTIONS.map((option) => (
                        <MenuItem key={option || "EMPTY"} value={option}>
                          {option ? leaveReasonText(option) : "Sin motivo"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      label="Baja notificada/firmada"
                      select
                      size="small"
                      fullWidth
                      disabled={enrolledCourseForm.course_status === "APTO"}
                      value={enrolledCourseForm.leave_notification}
                      onChange={(e) =>
                        setEnrolledCourseForm((f) => ({
                          ...f,
                          leave_notification: e.target.value as EnrolledCourseForm["leave_notification"],
                        }))
                      }
                    >
                      {LEAVE_NOTIFICATION_OPTIONS.map((option) => (
                        <MenuItem key={option || "EMPTY"} value={option}>
                          {option ? leaveNotificationText(option) : "Sin notificación"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button variant="outlined" onClick={resetEnrolledCourseForm} disabled={enrolledCourseSaving}>
                        Cancelar
                      </Button>
                      <Button variant="contained" onClick={saveEnrolledCourse} disabled={enrolledCourseSaving}>
                        Guardar cambios
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  Selecciona un itinerario en la tabla para editar estado y datos de baja.
                </Typography>
              )}
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCoursesOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Entrevistas: listado completo + CRUD */}
      <Dialog open={interviewsOpen} onClose={() => setInterviewsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Entrevistas</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DonutChart slices={interviewsChartSlices} size={92} thickness={14} />
                <Stack spacing={0.25}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Total: {interviews.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enviadas: {interviewsSent} · Asistidas: {interviewsAttended} · No asistió: {interviewsNoShow}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Contratos: {contracts.length}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {interviewForm.id ? "Editar entrevista" : "Nueva entrevista"}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DateTextField
                    label="Fecha"
                    size="small"
                    fullWidth
                    value={interviewForm.interview_date}
                    onChange={(nextIso) => setInterviewForm((f) => ({ ...f, interview_date: nextIso }))}
                    placeholder="dd/mm/aaaa"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Estado"
                    select
                    size="small"
                    fullWidth
                    value={interviewForm.status}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, status: e.target.value as any }))}
                  >
                    <MenuItem value="sent">Enviada</MenuItem>
                    <MenuItem value="attended">Asistida</MenuItem>
                    <MenuItem value="no_show">No asistió</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Lugar"
                    size="small"
                    fullWidth
                    value={interviewForm.place}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, place: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Notas"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      disabled={interviewSaving}
                      onClick={() => setInterviewForm({ interview_date: "", status: "sent", place: "", notes: "" })}
                    >
                      Nueva entrevista
                    </Button>
                    <Button
                      variant="contained"
                      disabled={interviewSaving || !interviewForm.interview_date}
                      onClick={saveInterview}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Lugar</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interviews.map((i) => (
                    <TableRow key={i.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(i.interview_date)}</TableCell>
                      <TableCell>{interviewStatusChip(i.status)}</TableCell>
                      <TableCell>{i.place ?? "-"}</TableCell>
                      <TableCell>{i.notes ?? ""}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() =>
                              setInterviewForm({
                                id: i.id,
                                interview_date: fmtDate(i.interview_date),
                                status: (i.status ?? "sent") as any,
                                place: i.place ?? "",
                                notes: i.notes ?? "",
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button size="small" color="error" onClick={() => deleteInterview(i.id)}>
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {interviews.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay entrevistas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterviewsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Invitaciones: listado completo + CRUD */}
      <Dialog open={invitationsOpen} onClose={closeInvitationsDialog} fullWidth maxWidth="md">
        <DialogTitle>Invitaciones</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DonutChart slices={invitationsChartSlices} size={92} thickness={14} />
                <Stack spacing={0.25}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Enviadas: {invitations.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Generaron entrevista: {invitationsAccepted}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              {!invitationFormMode ? (
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Acciones</Typography>
                    <Button variant="outlined" onClick={startCreateInvitation}>
                      Nueva invitación
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Presiona NUEVA INVITACIÓN o edita una existente para mostrar el formulario.
                  </Typography>
                </Stack>
              ) : (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {invitationFormMode === "edit" ? "Editar invitación" : "Nueva invitación"}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Vacante"
                        select
                        size="small"
                        fullWidth
                        disabled={invitationFormMode === "edit"}
                        value={invitationForm.vacancy_id}
                        onChange={(e) => setInvitationForm((f) => ({ ...f, vacancy_id: e.target.value }))}
                      >
                        {vacancies
                          .filter((v) => v.status === "open")
                          .map((v) => (
                            <MenuItem key={v.id} value={String(v.id)}>
                              {v.title} — {companyName.get(v.company_id) || `ID #${v.company_id}`}
                            </MenuItem>
                          ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Estado"
                        select
                        size="small"
                        fullWidth
                        disabled={invitationFormMode === "create"}
                        value={invitationForm.status}
                        onChange={(e) => setInvitationForm((f) => ({ ...f, status: e.target.value as any }))}
                      >
                        <MenuItem value="sent">Enviada</MenuItem>
                        <MenuItem value="accepted">Aceptada</MenuItem>
                        <MenuItem value="rejected">Rechazada</MenuItem>
                        <MenuItem value="expired">Expirada</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <DateTextField
                        label="Fecha envío"
                        size="small"
                        fullWidth
                        value={invitationForm.sent_at}
                        onChange={(nextIso) => setInvitationForm((f) => ({ ...f, sent_at: nextIso }))}
                        placeholder="dd/mm/aaaa"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <DateTextField
                        label="Fecha respuesta"
                        size="small"
                        fullWidth
                        disabled={invitationFormMode === "create"}
                        value={invitationForm.responded_at}
                        onChange={(nextIso) => setInvitationForm((f) => ({ ...f, responded_at: nextIso }))}
                        placeholder="dd/mm/aaaa"
                      />
                    </Grid>

                    {invitationFormMode === "create" && (
                      <Grid size={{ xs: 12 }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={invitationNotify.email}
                                onChange={(e) => setInvitationNotify((n) => ({ ...n, email: e.target.checked }))}
                              />
                            }
                            label="Notificar por Email"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={invitationNotify.whatsapp}
                                onChange={(e) => setInvitationNotify((n) => ({ ...n, whatsapp: e.target.checked }))}
                              />
                            }
                            label="Notificar por WhatsApp"
                          />
                        </Stack>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button variant="outlined" disabled={invitationSaving} onClick={cancelInvitationForm}>
                          Cancelar
                        </Button>
                        <Button
                          variant="contained"
                          disabled={invitationSaving || (invitationFormMode === "create" && !invitationForm.vacancy_id)}
                          onClick={saveInvitation}
                        >
                          Guardar
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vacante</TableCell>
                    <TableCell>Empresa</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Enviada</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Respuesta</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id} hover>
                      <TableCell>{inv.vacancy_title}</TableCell>
                      <TableCell>{inv.company_name}</TableCell>
                      <TableCell>{statusChip(inv.status)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(inv.sent_at)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(inv.responded_at)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => startEditInvitation(inv)}>
                            Editar
                          </Button>
                          <Button size="small" color="error" onClick={() => deleteInvitation(inv.id)}>
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {invitations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay invitaciones
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInvitationsDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Prácticas: listado completo + CRUD */}
      <Dialog open={practicesOpen} onClose={() => setPracticesOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>Prácticas no Laborales ({practiceRows.length})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total: {practiceRows.length}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {practiceForm.id ? "Editar práctica" : "Nueva práctica"}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    label="Expediente"
                    size="small"
                    fullWidth
                    value={practiceForm.expediente}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, expediente: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em>Selecciona expediente</em>
                    </MenuItem>
                    {enrolledCourses.map((c) => (
                      <MenuItem key={c.expediente} value={c.expediente}>
                        {`${c.expediente} · ${c.itinerary_name || c.course_code}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    label="¿Hace prácticas?"
                    size="small"
                    fullWidth
                    value={practiceForm.does_practices}
                    onChange={(e) =>
                      setPracticeForm((f) => ({
                        ...f,
                        does_practices: e.target.value as (typeof PRACTICE_STATE_OPTIONS)[number],
                      }))
                    }
                  >
                    {PRACTICE_STATE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {practiceStateText(opt)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    label="Estado prácticas"
                    size="small"
                    fullWidth
                    value={practiceForm.practice_status}
                    onChange={(e) =>
                      setPracticeForm((f) => ({
                        ...f,
                        practice_status: e.target.value as (typeof PRACTICE_STATUS_OPTIONS)[number],
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>—</em>
                    </MenuItem>
                    {PRACTICE_STATUS_OPTIONS.filter(Boolean).map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {practiceStatusText(opt)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Empresa"
                    size="small"
                    fullWidth
                    value={practiceForm.company_name}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, company_name: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Centro de prácticas"
                    size="small"
                    fullWidth
                    value={practiceForm.workplace}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, workplace: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <DateTextField
                    label="Inicio"
                    size="small"
                    fullWidth
                    value={practiceForm.start_date}
                    onChange={(nextIso) => setPracticeForm((f) => ({ ...f, start_date: nextIso }))}
                    placeholder="dd/mm/aaaa"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DateTextField
                    label="Fin"
                    size="small"
                    fullWidth
                    value={practiceForm.end_date}
                    onChange={(nextIso) => setPracticeForm((f) => ({ ...f, end_date: nextIso }))}
                    placeholder="dd/mm/aaaa"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <DateTextField
                    label="Fecha baja"
                    size="small"
                    fullWidth
                    value={practiceForm.leave_date}
                    onChange={(nextIso) => setPracticeForm((f) => ({ ...f, leave_date: nextIso }))}
                    placeholder="dd/mm/aaaa"
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Nº días asistencia"
                    type="number"
                    size="small"
                    fullWidth
                    value={practiceForm.attendance_days}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, attendance_days: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Turno"
                    size="small"
                    fullWidth
                    value={practiceForm.practice_shift}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, practice_shift: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Condiciones"
                    size="small"
                    fullWidth
                    value={practiceForm.conditions_for_practice}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, conditions_for_practice: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Horario"
                    size="small"
                    fullWidth
                    value={practiceForm.schedule}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, schedule: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Valoración prácticas"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={practiceForm.evaluation}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, evaluation: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Observaciones"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={practiceForm.observations}
                    onChange={(e) => setPracticeForm((f) => ({ ...f, observations: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" disabled={practiceSaving} onClick={startCreatePractice}>
                      Nueva práctica
                    </Button>
                    <Button
                      variant="contained"
                      disabled={practiceSaving || !practiceForm.expediente.trim()}
                      onClick={savePractice}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1700 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Expediente</TableCell>
                      <TableCell>Itinerario</TableCell>
                      <TableCell>Empresa</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Hace prácticas</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Inicio</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Fin</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Baja</TableCell>
                      <TableCell>Días</TableCell>
                      <TableCell>Centro</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {practiceSorted.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell>{p.expediente}</TableCell>
                        <TableCell>{p.itinerary_name || p.course_code || "-"}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.company_name || p.company_name_resolved || "-"}
                          </Typography>
                        </TableCell>
                        <TableCell>{practiceStatusText(p.practice_status)}</TableCell>
                        <TableCell>{practiceStateText(p.does_practices)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(p.start_date)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(p.end_date)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(p.leave_date)}</TableCell>
                        <TableCell>{p.attendance_days ?? "-"}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {p.workplace ?? "-"}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => startEditPractice(p)}>
                              Editar
                            </Button>
                            <Button size="small" color="error" onClick={() => deletePractice(p.id)}>
                              Eliminar
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {practiceRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No hay prácticas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPracticesOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Contrataciones: listado completo + CRUD */}
      <Dialog open={contractsOpen} onClose={closeContractsDialog} fullWidth maxWidth="lg">
        <DialogTitle>Contrataciones ({contracts.length})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              {!contractFormMode ? (
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Acciones</Typography>
                    <Button variant="outlined" onClick={startCreateContract}>
                      Nueva contratación
                    </Button>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Presiona NUEVA CONTRATACIÓN o edita una existente para mostrar el formulario.
                  </Typography>
                </Stack>
              ) : (
                <>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    {contractFormMode === "edit" ? "Editar contratación" : "Nueva contratación"}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="Empresa"
                        size="small"
                        fullWidth
                        value={contractForm.company_name}
                        onChange={(e) => setContractForm((f) => ({ ...f, company_name: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        label="NIF empresa"
                        size="small"
                        fullWidth
                        value={contractForm.company_nif}
                        onChange={(e) => setContractForm((f) => ({ ...f, company_nif: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        label="Sector"
                        size="small"
                        fullWidth
                        value={contractForm.sector}
                        onChange={(e) => setContractForm((f) => ({ ...f, sector: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="Tipo de contrato"
                        size="small"
                        fullWidth
                        value={contractForm.contract_type}
                        onChange={(e) => setContractForm((f) => ({ ...f, contract_type: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      >
                        <MenuItem value="">
                          <em>—</em>
                        </MenuItem>
                        {contractForm.contract_type && !CONTRACT_TYPE_OPTIONS.includes(contractForm.contract_type as any) && (
                          <MenuItem value={contractForm.contract_type}>{contractForm.contract_type} (actual)</MenuItem>
                        )}
                        {CONTRACT_TYPE_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        label="Jornada"
                        size="small"
                        fullWidth
                        value={contractForm.workday_pct}
                        onChange={(e) => setContractForm((f) => ({ ...f, workday_pct: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      >
                        <MenuItem value="">
                          <em>—</em>
                        </MenuItem>
                        {contractForm.workday_pct && !WORKDAY_OPTIONS.includes(contractForm.workday_pct as any) && (
                          <MenuItem value={contractForm.workday_pct}>{contractForm.workday_pct} (actual)</MenuItem>
                        )}
                        {WORKDAY_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        select
                        label="Grupo Cotización"
                        size="small"
                        fullWidth
                        value={contractForm.contribution_group}
                        onChange={(e) => setContractForm((f) => ({ ...f, contribution_group: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      >
                        <MenuItem value="">
                          <em>—</em>
                        </MenuItem>
                        {contractForm.contribution_group &&
                          !CONTRIBUTION_GROUP_OPTIONS.includes(contractForm.contribution_group as any) && (
                            <MenuItem value={contractForm.contribution_group}>{contractForm.contribution_group} (actual)</MenuItem>
                          )}
                        {CONTRIBUTION_GROUP_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <DateTextField
                        label="Fecha de alta"
                        size="small"
                        fullWidth
                        value={contractForm.start_date}
                        onChange={(nextIso) => setContractForm((f) => ({ ...f, start_date: nextIso }))}
                        placeholder="dd/mm/aaaa"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <DateTextField
                        label="Fecha de baja"
                        size="small"
                        fullWidth
                        value={contractForm.end_date}
                        onChange={(nextIso) => setContractForm((f) => ({ ...f, end_date: nextIso }))}
                        placeholder="dd/mm/aaaa"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        label="Horas/sem"
                        type="number"
                        size="small"
                        fullWidth
                        value={contractForm.weekly_hours}
                        onChange={(e) => setContractForm((f) => ({ ...f, weekly_hours: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        label="Días cotizados"
                        type="number"
                        size="small"
                        fullWidth
                        value={contractForm.contributed_days}
                        onChange={(e) => setContractForm((f) => ({ ...f, contributed_days: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Notas"
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        value={contractForm.notes}
                        onChange={(e) => setContractForm((f) => ({ ...f, notes: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button variant="outlined" disabled={contractSaving} onClick={cancelContractForm}>
                          Cancelar
                        </Button>
                        <Button variant="outlined" startIcon={<UploadFileIcon />} disabled={contractSaving}>
                          Nueva desde PDF
                        </Button>
                        <Button
                          variant="contained"
                          disabled={
                            contractSaving ||
                            !contractForm.company_nif.trim() ||
                            !contractForm.company_name.trim() ||
                            !contractForm.start_date
                          }
                          onClick={saveContract}
                        >
                          Guardar
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Empresa</TableCell>
                      <TableCell>Sector</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Tipo de contrato</TableCell>
                      <TableCell>Jornada</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Grupo Cotización</TableCell>
                      <TableCell>Horas/sem</TableCell>
                      <TableCell>Días cotizados</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha de alta</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Fecha de baja</TableCell>
                      <TableCell>Notas</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contractsSorted.map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {c.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.company_nif}
                          </Typography>
                        </TableCell>
                        <TableCell>{c.sector ?? "-"}</TableCell>
                        <TableCell>{c.contract_type ?? "-"}</TableCell>
                        <TableCell>{c.workday_pct ?? "-"}</TableCell>
                        <TableCell>{c.contribution_group ?? "-"}</TableCell>
                        <TableCell>{c.weekly_hours ?? "-"}</TableCell>
                        <TableCell>{c.contributed_days ?? "-"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(c.start_date)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateDMY(c.end_date)}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {c.notes ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" onClick={() => startEditContract(c)}>
                              Editar
                            </Button>
                            <Button size="small" color="error" onClick={() => deleteContract(c.id)}>
                              Eliminar
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {contracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No hay contratos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeContractsDialog}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
