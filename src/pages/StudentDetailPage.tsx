import { useParams, Link as RouterLink } from "react-router-dom";
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
import type { Company, Interview, Student, Vacancy } from "../types";
import { computeMatchingScore, scoreColor } from "../utils/MatchingEngine";

type StudentCourse = {
  id: number;
  student_id: number;
  title: string;
  description?: string | null;
  institution?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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

type PnlRow = {
  id: number;
  student_id: number;
  company_nif: string;
  company_name: string;
  signer_name?: string | null;
  signer_nif?: string | null;
  workplace?: string | null;
  position?: string | null;
  start_date: string;
  end_date?: string | null;
  schedule?: string | null;
  weekly_hours?: number | null;
  observations?: string | null;
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

function fmtDate(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function employmentStatusText(s: unknown): string {
  switch ((s ?? "").toString().toLowerCase()) {
    case "unemployed":
      return "Desempleado";
    case "employed":
      return "Empleado";
    case "improved":
      return "Buscando mejor opción";
    default:
      return "Desconocido";
  }
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

  const [student, setStudent] = useState<Student | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [pnlRows, setPnlRows] = useState<PnlRow[]>([]);
  const [contracts, setContracts] = useState<HiringContractRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  // Student editing
  const [editingStudent, setEditingStudent] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentDraft, setStudentDraft] = useState({
    first_names: "",
    last_names: "",
    dni_nie: "",
    social_security_number: "",
    birth_date: "",
    district: "",
    phone: "",
    email: "",
    employment_status: "unknown" as "unemployed" | "employed" | "improved" | "unknown",
  });

  // Dialogs
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [recommendedOpen, setRecommendedOpen] = useState(false);
  const [interviewsOpen, setInterviewsOpen] = useState(false);
  const [invitationsOpen, setInvitationsOpen] = useState(false);
  const [pnlOpen, setPnlOpen] = useState(false);
  const [contractsOpen, setContractsOpen] = useState(false);

  // Courses form (create/update)
  const [courseForm, setCourseForm] = useState<{
    id?: number;
    title: string;
    description: string;
    institution: string;
    start_date: string;
    end_date: string;
  }>({
    title: "",
    description: "",
    institution: "",
    start_date: "",
    end_date: "",
  });
  const [courseSaving, setCourseSaving] = useState(false);

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
  }>({
    vacancy_id: "",
    status: "sent",
    sent_at: "",
    responded_at: "",
  });
  const [invitationSaving, setInvitationSaving] = useState(false);
  const [invitationNotify, setInvitationNotify] = useState({ email: false, whatsapp: false });

  // PnL form
  const [pnlForm, setPnlForm] = useState<{
    id?: number;
    company_nif: string;
    company_name: string;
    signer_name: string;
    signer_nif: string;
    workplace: string;
    position: string;
    start_date: string;
    end_date: string;
    schedule: string;
    weekly_hours: string;
    observations: string;
  }>({
    company_nif: "",
    company_name: "",
    signer_name: "",
    signer_nif: "",
    workplace: "",
    position: "",
    start_date: "",
    end_date: "",
    schedule: "",
    weekly_hours: "",
    observations: "",
  });
  const [pnlSaving, setPnlSaving] = useState(false);

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
  }>({
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
  });
  const [contractSaving, setContractSaving] = useState(false);

  const sid = String(id ?? "").trim();

  const companyName = useMemo(() => {
    const m = new Map<number, string>();
    companies.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [companies]);

  const recommended = useMemo(() => {
    if (!student || vacancies.length === 0) return [] as { vacancy: Vacancy; score: number }[];

    const scored = vacancies
      .filter((v) => v.status === "open")
      .map((v) => ({ vacancy: v, score: computeMatchingScore(student, v) }));

    return scored
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [student, vacancies]);

  const lastCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => (fmtDate(b.end_date || b.start_date) || "").localeCompare(fmtDate(a.end_date || a.start_date) || ""))
      .slice(0, 4);
  }, [courses]);

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

  const pnlSorted = useMemo(() => {
    return [...pnlRows].sort((a, b) => fmtDate(b.start_date).localeCompare(fmtDate(a.start_date)));
  }, [pnlRows]);

  const contractsSorted = useMemo(() => {
    return [...contracts].sort((a, b) => fmtDate(b.start_date).localeCompare(fmtDate(a.start_date)));
  }, [contracts]);

  const pnlSummary = useMemo(() => pnlSorted.slice(0, 3), [pnlSorted]);
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
    const [sRes, vRes, cRes, iRes, scRes, invRes, pnlRes, hcRes] = await Promise.all([
      api.get<Student>(`/students/${currentSid}`),
      api.get<Vacancy[]>(`/vacancies`),
      api.get<Company[]>(`/companies`),
      api.get<Interview[]>(`/interviews`, { params: { student_id: n } }),
      api.get<StudentCourse[]>(`/student-courses`, { params: { student_id: n } }),
      api.get<InvitationRow[]>(`/invitations`, { params: { student_id: n } }),
      api.get<PnlRow[]>(`/pnl`, { params: { student_id: n } }),
      api.get<HiringContractRow[]>(`/hiring-contracts`, { params: { student_id: n } }),
    ]);

    return {
      student: sRes.data,
      vacancies: Array.isArray(vRes.data) ? vRes.data : [],
      companies: Array.isArray(cRes.data) ? cRes.data : [],
      interviews: Array.isArray(iRes.data) ? iRes.data : [],
      courses: Array.isArray(scRes.data) ? scRes.data : [],
      invitations: Array.isArray(invRes.data) ? invRes.data : [],
      pnlRows: Array.isArray(pnlRes.data) ? pnlRes.data : [],
      contracts: Array.isArray(hcRes.data) ? hcRes.data : [],
    };
  }

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
        setCourses(data.courses);
        setInvitations(data.invitations);
        setPnlRows(data.pnlRows);
        setContracts(data.contracts);
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
      district: student.district || "",
      phone: student.phone || "",
      email: student.email || "",
      employment_status: (student.employment_status || "unknown") as any,
    });
  }, [student]);

  async function saveStudent() {
    if (!student) return;
    try {
      setActionError(null);
      setSavingStudent(true);
      await api.put(`/students/${student.id}`, {
        first_names: studentDraft.first_names,
        last_names: studentDraft.last_names,
        dni_nie: studentDraft.dni_nie,
        social_security_number: studentDraft.social_security_number || null,
        birth_date: studentDraft.birth_date || null,
        district: studentDraft.district || null,
        phone: studentDraft.phone || null,
        email: studentDraft.email || null,
        employment_status: studentDraft.employment_status,
      });

      setStudent({
        ...student,
        first_names: studentDraft.first_names,
        last_names: studentDraft.last_names,
        dni_nie: studentDraft.dni_nie,
        social_security_number: studentDraft.social_security_number || null,
        birth_date: studentDraft.birth_date || null,
        district: studentDraft.district || null,
        phone: studentDraft.phone || null,
        email: studentDraft.email || null,
        employment_status: studentDraft.employment_status,
      });

      setEditingStudent(false);
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar");
    } finally {
      setSavingStudent(false);
    }
  }

  async function saveCourse() {
    const n = Number(sid);
    if (!Number.isFinite(n) || !courseForm.title.trim()) return;

    try {
      setCourseSaving(true);
      if (courseForm.id) {
        await api.put(`/student-courses/${courseForm.id}`, {
          title: courseForm.title,
          description: courseForm.description || null,
          institution: courseForm.institution || null,
          start_date: courseForm.start_date || null,
          end_date: courseForm.end_date || null,
        });
      } else {
        await api.post(`/student-courses`, {
          student_id: n,
          title: courseForm.title,
          description: courseForm.description || null,
          institution: courseForm.institution || null,
          start_date: courseForm.start_date || null,
          end_date: courseForm.end_date || null,
        });
      }

      const { data } = await api.get<StudentCourse[]>(`/student-courses`, { params: { student_id: n } });
      setCourses(Array.isArray(data) ? data : []);
      setCourseForm({ title: "", description: "", institution: "", start_date: "", end_date: "" });
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar curso");
    } finally {
      setCourseSaving(false);
    }
  }

  async function deleteCourse(courseId: number) {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;

    try {
      await api.delete(`/student-courses/${courseId}`);
      const { data } = await api.get<StudentCourse[]>(`/student-courses`, { params: { student_id: n } });
      setCourses(Array.isArray(data) ? data : []);

      if (courseForm.id === courseId) {
        setCourseForm({ title: "", description: "", institution: "", start_date: "", end_date: "" });
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar curso");
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

  async function refreshPnl() {
    const n = Number(sid);
    if (!Number.isFinite(n)) return;
    const { data } = await api.get<PnlRow[]>(`/pnl`, { params: { student_id: n } });
    setPnlRows(Array.isArray(data) ? data : []);
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

  async function saveInvitation() {
    const n = Number(sid);
    const vid = Number(invitationForm.vacancy_id);
    if (!Number.isFinite(n)) return;

    const isCreating = !invitationForm.id;
    const notify = { ...invitationNotify };

    if (isCreating && !Number.isFinite(vid)) return;

    const responded_at =
      invitationForm.responded_at ||
      (["accepted", "rejected"].includes(invitationForm.status) ? fmtDate(new Date()) : "");

    try {
      setActionError(null);
      setInvitationSaving(true);

      if (invitationForm.id) {
        await api.put(`/invitations/${invitationForm.id}`, {
          status: invitationForm.status,
          sent_at: invitationForm.sent_at || null,
          responded_at: responded_at || null,
        });
      } else {
        await api.post(`/invitations`, {
          vacancy_id: vid,
          student_id: n,
          status: invitationForm.status,
          sent_at: invitationForm.sent_at || null,
          responded_at: responded_at || null,
        });
      }

      await refreshInvitations();
      setInvitationForm({ vacancy_id: "", status: "sent", sent_at: "", responded_at: "" });
      setInvitationNotify({ email: false, whatsapp: false });

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
        setInvitationForm({ vacancy_id: "", status: "sent", sent_at: "", responded_at: "" });
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar invitación");
    }
  }

  async function savePnl() {
    const n = Number(sid);
    if (!Number.isFinite(n) || !pnlForm.company_nif.trim() || !pnlForm.company_name.trim() || !pnlForm.start_date) return;

    try {
      setActionError(null);
      setPnlSaving(true);

      const payload = {
        student_id: n,
        company_nif: pnlForm.company_nif,
        company_name: pnlForm.company_name,
        signer_name: pnlForm.signer_name || null,
        signer_nif: pnlForm.signer_nif || null,
        workplace: pnlForm.workplace || null,
        position: pnlForm.position || null,
        start_date: pnlForm.start_date,
        end_date: pnlForm.end_date || null,
        schedule: pnlForm.schedule || null,
        weekly_hours: toIntOrNull(pnlForm.weekly_hours),
        observations: pnlForm.observations || null,
      };

      if (pnlForm.id) {
        await api.put(`/pnl/${pnlForm.id}`, payload);
      } else {
        await api.post(`/pnl`, payload);
      }

      await refreshPnl();
      setPnlForm({
        company_nif: "",
        company_name: "",
        signer_name: "",
        signer_nif: "",
        workplace: "",
        position: "",
        start_date: "",
        end_date: "",
        schedule: "",
        weekly_hours: "",
        observations: "",
      });
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al guardar PnL");
    } finally {
      setPnlSaving(false);
    }
  }

  async function deletePnl(pnlId: number) {
    try {
      setActionError(null);
      await api.delete(`/pnl/${pnlId}`);
      await refreshPnl();
      if (pnlForm.id === pnlId) {
        setPnlForm({
          company_nif: "",
          company_name: "",
          signer_name: "",
          signer_nif: "",
          workplace: "",
          position: "",
          start_date: "",
          end_date: "",
          schedule: "",
          weekly_hours: "",
          observations: "",
        });
      }
    } catch (e: any) {
      setActionError(e?.response?.data?.error || e?.message || "Error al eliminar PnL");
    }
  }

  async function saveContract() {
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

      if (contractForm.id) {
        await api.put(`/hiring-contracts/${contractForm.id}`, payload);
      } else {
        await api.post(`/hiring-contracts`, payload);
      }

      await refreshContracts();
      setContractForm({
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
      });
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
        setContractForm({
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
        });
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
        <Button component={RouterLink} to="/students" sx={{ mt: 1 }}>
          Volver
        </Button>
      </Box>
    );

  if (loadError)
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {loadError}</Typography>
        <Button component={RouterLink} to="/students" sx={{ mt: 1 }}>
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
            Nº expediente: {student.id}
          </Typography>
        </Stack>
        <Button component={RouterLink} to="/students">
          Volver
        </Button>
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
                              district: student.district || "",
                              phone: student.phone || "",
                              email: student.email || "",
                              employment_status: (student.employment_status || "unknown") as any,
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

                    <InfoRow label="DNI / NIE">
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
                        <TextField
                          size="small"
                          type="date"
                          value={studentDraft.birth_date}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, birth_date: e.target.value }))}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                        />
                      ) : (
                        <Typography variant="body2">{student.birth_date ? fmtDate(student.birth_date) : "-"}</Typography>
                      )}
                    </InfoRow>

                    <InfoRow label="Distrito">
                      {editingStudent ? (
                        <TextField
                          size="small"
                          value={studentDraft.district}
                          onChange={(e) => setStudentDraft((d) => ({ ...d, district: e.target.value }))}
                          fullWidth
                        />
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

                    <InfoRow label="Situación laboral">
                      {editingStudent ? (
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={studentDraft.employment_status}
                          onChange={(e) =>
                            setStudentDraft((d) => ({
                              ...d,
                              employment_status: e.target.value as any,
                            }))
                          }
                        >
                          <MenuItem value="unemployed">Desempleado</MenuItem>
                          <MenuItem value="employed">Empleado</MenuItem>
                          <MenuItem value="improved">Buscando mejor opción</MenuItem>
                          {studentDraft.employment_status === "unknown" && (
                            <MenuItem value="unknown" disabled>
                              Desconocido
                            </MenuItem>
                          )}
                        </TextField>
                      ) : (
                        <Chip size="small" label={employmentStatusText(student.employment_status)} />
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
                              <Typography variant="body2">{fmtDate(i.interview_date)}</Typography>
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
                    <Button size="small" variant="outlined" onClick={() => setInvitationsOpen(true)}>
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
                              {inv.company_name} · {fmtDate(inv.sent_at)}
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

            {/* PnL + Contrataciones */}
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      PnL (Prácticas no Laborales) ({pnlRows.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setPnlOpen(true)}>
                      Ver
                    </Button>
                  </Stack>
                  <Divider sx={{ mb: 1.5 }} />

                  {pnlRows.length ? (
                    <Stack spacing={1}>
                      {pnlSummary.map((p) => (
                        <Box key={p.id}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.position ?? "-"} · {fmtDate(p.start_date)} → {fmtDate(p.end_date) || "-"}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Sin PnL registrada</Typography>
                  )}
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: "100%" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Contrataciones ({contracts.length})
                    </Typography>
                    <Button size="small" variant="outlined" onClick={() => setContractsOpen(true)}>
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
                            {(c.contract_type || "-") + " · " + fmtDate(c.start_date) + " → " + (fmtDate(c.end_date) || "-")}
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
                  Cursos realizados ({courses.length})
                </Typography>
                <Button size="small" variant="outlined" onClick={() => setCoursesOpen(true)}>
                  Ver detalles
                </Button>
              </Stack>
              <Divider sx={{ mb: 1.5 }} />

              {lastCourses.length ? (
                <Stack spacing={1}>
                  {lastCourses.map((c) => (
                    <Box key={c.id}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {c.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(c.institution || "-") + " · " + (fmtDate(c.start_date) || "-") + " → " + (fmtDate(c.end_date) || "-")}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary">Sin cursos registrados</Typography>
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
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(vacancy.created_at) || "-"}</TableCell>
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
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {courseForm.id ? "Editar curso" : "Nuevo curso"}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Título"
                    size="small"
                    fullWidth
                    value={courseForm.title}
                    onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Institución"
                    size="small"
                    fullWidth
                    value={courseForm.institution}
                    onChange={(e) => setCourseForm((f) => ({ ...f, institution: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Fecha inicio"
                    type="date"
                    size="small"
                    fullWidth
                    value={courseForm.start_date}
                    onChange={(e) => setCourseForm((f) => ({ ...f, start_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Fecha fin"
                    type="date"
                    size="small"
                    fullWidth
                    value={courseForm.end_date}
                    onChange={(e) => setCourseForm((f) => ({ ...f, end_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Descripción"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={courseForm.description}
                    onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => setCourseForm({ title: "", description: "", institution: "", start_date: "", end_date: "" })}
                      disabled={courseSaving}
                    >
                      Nuevo curso
                    </Button>
                    <Button variant="contained" onClick={saveCourse} disabled={courseSaving || !courseForm.title.trim()}>
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
                    <TableCell>Curso</TableCell>
                    <TableCell>Institución</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Inicio</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>Fin</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {c.title}
                        </Typography>
                        {c.description && (
                          <Typography variant="caption" color="text.secondary">
                            {c.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{c.institution ?? "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(c.start_date) || "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(c.end_date) || "-"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() =>
                              setCourseForm({
                                id: c.id,
                                title: c.title,
                                description: c.description ?? "",
                                institution: c.institution ?? "",
                                start_date: fmtDate(c.start_date),
                                end_date: fmtDate(c.end_date),
                              })
                            }
                          >
                            Editar
                          </Button>
                          <Button size="small" color="error" onClick={() => deleteCourse(c.id)}>
                            Eliminar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {courses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No hay cursos
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                  <TextField
                    label="Fecha"
                    type="date"
                    size="small"
                    fullWidth
                    value={interviewForm.interview_date}
                    onChange={(e) => setInterviewForm((f) => ({ ...f, interview_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
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
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(i.interview_date) || "-"}</TableCell>
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
      <Dialog open={invitationsOpen} onClose={() => setInvitationsOpen(false)} fullWidth maxWidth="md">
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
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {invitationForm.id ? "Editar invitación" : "Nueva invitación"}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Vacante"
                    select
                    size="small"
                    fullWidth
                    disabled={!!invitationForm.id}
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
                  <TextField
                    label="Fecha envío"
                    type="date"
                    size="small"
                    fullWidth
                    value={invitationForm.sent_at}
                    onChange={(e) => setInvitationForm((f) => ({ ...f, sent_at: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Fecha respuesta"
                    type="date"
                    size="small"
                    fullWidth
                    value={invitationForm.responded_at}
                    onChange={(e) => setInvitationForm((f) => ({ ...f, responded_at: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>

                {!invitationForm.id && (
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
                    <Button
                      variant="outlined"
                      disabled={invitationSaving}
                      onClick={() => {
                        setInvitationForm({ vacancy_id: "", status: "sent", sent_at: "", responded_at: "" });
                        setInvitationNotify({ email: false, whatsapp: false });
                      }}
                    >
                      Nueva invitación
                    </Button>
                    <Button
                      variant="contained"
                      disabled={invitationSaving || (!invitationForm.id && !invitationForm.vacancy_id)}
                      onClick={saveInvitation}
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
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(inv.sent_at) || "-"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{inv.responded_at ? fmtDate(inv.responded_at) : "-"}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() =>
                              setInvitationForm({
                                id: inv.id,
                                vacancy_id: String(inv.vacancy_id),
                                status: inv.status,
                                sent_at: fmtDate(inv.sent_at),
                                responded_at: inv.responded_at ? fmtDate(inv.responded_at) : "",
                              })
                            }
                          >
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
          <Button onClick={() => setInvitationsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* PnL: listado completo + CRUD */}
      <Dialog open={pnlOpen} onClose={() => setPnlOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>PnL (Prácticas no Laborales)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total: {pnlRows.length}
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {pnlForm.id ? "Editar PnL" : "Nueva PnL"}
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Empresa"
                    size="small"
                    fullWidth
                    value={pnlForm.company_name}
                    onChange={(e) => setPnlForm((f) => ({ ...f, company_name: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="NIF empresa"
                    size="small"
                    fullWidth
                    value={pnlForm.company_nif}
                    onChange={(e) => setPnlForm((f) => ({ ...f, company_nif: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Firmante"
                    size="small"
                    fullWidth
                    value={pnlForm.signer_name}
                    onChange={(e) => setPnlForm((f) => ({ ...f, signer_name: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="NIF firmante"
                    size="small"
                    fullWidth
                    value={pnlForm.signer_nif}
                    onChange={(e) => setPnlForm((f) => ({ ...f, signer_nif: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Centro"
                    size="small"
                    fullWidth
                    value={pnlForm.workplace}
                    onChange={(e) => setPnlForm((f) => ({ ...f, workplace: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Puesto"
                    size="small"
                    fullWidth
                    value={pnlForm.position}
                    onChange={(e) => setPnlForm((f) => ({ ...f, position: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Inicio"
                    type="date"
                    size="small"
                    fullWidth
                    value={pnlForm.start_date}
                    onChange={(e) => setPnlForm((f) => ({ ...f, start_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Fin"
                    type="date"
                    size="small"
                    fullWidth
                    value={pnlForm.end_date}
                    onChange={(e) => setPnlForm((f) => ({ ...f, end_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="Horas/sem"
                    type="number"
                    size="small"
                    fullWidth
                    value={pnlForm.weekly_hours}
                    onChange={(e) => setPnlForm((f) => ({ ...f, weekly_hours: e.target.value }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <TextField
                    label="Horario"
                    size="small"
                    fullWidth
                    value={pnlForm.schedule}
                    onChange={(e) => setPnlForm((f) => ({ ...f, schedule: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Observaciones"
                    size="small"
                    fullWidth
                    multiline
                    minRows={2}
                    value={pnlForm.observations}
                    onChange={(e) => setPnlForm((f) => ({ ...f, observations: e.target.value }))}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      disabled={pnlSaving}
                      onClick={() =>
                        setPnlForm({
                          company_nif: "",
                          company_name: "",
                          signer_name: "",
                          signer_nif: "",
                          workplace: "",
                          position: "",
                          start_date: "",
                          end_date: "",
                          schedule: "",
                          weekly_hours: "",
                          observations: "",
                        })
                      }
                    >
                      Nueva PnL
                    </Button>
                    <Button
                      variant="contained"
                      disabled={
                        pnlSaving || !pnlForm.company_nif.trim() || !pnlForm.company_name.trim() || !pnlForm.start_date
                      }
                      onClick={savePnl}
                    >
                      Guardar
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1500 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Empresa</TableCell>
                      <TableCell>Firmante</TableCell>
                      <TableCell>Centro</TableCell>
                      <TableCell>Puesto</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Inicio</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>Fin</TableCell>
                      <TableCell>Horario</TableCell>
                      <TableCell>Horas/sem</TableCell>
                      <TableCell>Observaciones</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pnlSorted.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.company_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.company_nif}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{p.signer_name ?? "-"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.signer_nif ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell>{p.workplace ?? "-"}</TableCell>
                        <TableCell>{p.position ?? "-"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(p.start_date)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(p.end_date) || "-"}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
                            {p.schedule ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell>{p.weekly_hours ?? "-"}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {p.observations ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              onClick={() =>
                                setPnlForm({
                                  id: p.id,
                                  company_nif: p.company_nif,
                                  company_name: p.company_name,
                                  signer_name: p.signer_name ?? "",
                                  signer_nif: p.signer_nif ?? "",
                                  workplace: p.workplace ?? "",
                                  position: p.position ?? "",
                                  start_date: fmtDate(p.start_date),
                                  end_date: fmtDate(p.end_date),
                                  schedule: p.schedule ?? "",
                                  weekly_hours: p.weekly_hours != null ? String(p.weekly_hours) : "",
                                  observations: p.observations ?? "",
                                })
                              }
                            >
                              Editar
                            </Button>
                            <Button size="small" color="error" onClick={() => deletePnl(p.id)}>
                              Eliminar
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pnlRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No hay PnL
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
          <Button onClick={() => setPnlOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Contrataciones: listado completo + CRUD */}
      <Dialog open={contractsOpen} onClose={() => setContractsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>Contrataciones ({contracts.length})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {contractForm.id ? "Editar cotización" : "Nueva cotización"}
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
                  <TextField
                    label="Fecha de alta"
                    type="date"
                    size="small"
                    fullWidth
                    value={contractForm.start_date}
                    onChange={(e) => setContractForm((f) => ({ ...f, start_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="Fecha de baja"
                    type="date"
                    size="small"
                    fullWidth
                    value={contractForm.end_date}
                    onChange={(e) => setContractForm((f) => ({ ...f, end_date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& input": { whiteSpace: "nowrap" } }}
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
                    <Button
                      variant="outlined"
                      disabled={contractSaving}
                      onClick={() =>
                        setContractForm({
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
                        })
                      }
                    >
                      Nueva cotización
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
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(c.start_date)}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(c.end_date) || "-"}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {c.notes ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              onClick={() =>
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
                                })
                              }
                            >
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
          <Button onClick={() => setContractsOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
