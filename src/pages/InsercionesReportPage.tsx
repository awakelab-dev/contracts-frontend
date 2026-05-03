import {
  Alert,
  Box,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { formatDateDMY } from "../utils/date";

type InsercionesApiRow = {
  insertion_id: number;
  expediente: string;
  student_id: number;
  itinerary_name?: string | null;
  first_names?: string | null;
  last_names?: string | null;
  dni_nie?: string | null;
  phone?: string | null;
  email?: string | null;
  course_status?: string | null;
  formation_end_date?: string | null;
  practice_company_name?: string | null;
  practice_start_date?: string | null;
  practice_end_date?: string | null;
  practice_does_practices?: string | null;
  practice_observations?: string | null;
  insertion_sector_name?: string | null;
  insertion_position?: string | null;
  insertion_company_name?: string | null;
  is_itinerary_company_contract?: string | null;
  contract_code?: number | null;
  contract_type?: string | null;
  workday?: string | null;
  hiring_mode?: string | null;
  attached_contract?: string | null;
  attached_work_life?: string | null;
  insertion_observations?: string | null;
  insertion_start_date?: string | null;
  insertion_end_date?: string | null;
};

type InsercionItem = {
  insertion_id: number;
  insertion_sector_name: string;
  insertion_position: string;
  insertion_company_name: string;
  is_itinerary_company_contract: "SI" | "NO";
  contract_code: string;
  contract_type: string;
  workday: string;
  hiring_mode: string;
  attached_contract: "SI" | "NO";
  attached_work_life: "SI" | "NO";
  insertion_observations: string;
  insertion_start_date: string;
  insertion_end_date: string;
};

type InsercionesGroupedRow = {
  expediente: string;
  student_id: number;
  itinerary_name: string;
  first_names: string;
  last_names: string;
  dni_nie: string;
  phone: string;
  email: string;
  course_status: "APTO" | "NO APTO" | "INSERCION" | "";
  formation_end_date: string;
  practice_company_name: string;
  practice_start_date: string;
  practice_end_date: string;
  is_working: "SI" | "NO";
  practice_observations: string;
  inserciones: InsercionItem[];
};

type SortDirection = "asc" | "desc";
type SortKey =
  | "expediente"
  | "itinerary_name"
  | "first_names"
  | "last_names"
  | "dni_nie"
  | "phone"
  | "email"
  | "course_status"
  | "formation_end_date"
  | "practice_company_name"
  | "practice_start_date"
  | "practice_end_date"
  | "practice_offer"
  | "practice_offer_acceptance"
  | "practice_offer_observations"
  | "is_working"
  | "worked_after_practices"
  | "practice_observations"
  | "insertion_sector"
  | "insertion_position"
  | "insertion_company"
  | "is_itinerary_company_contract"
  | "contract_code"
  | "contract_type"
  | "workday"
  | "hiring_mode"
  | "attached_contract"
  | "attached_work_life"
  | "insertion_observations"
  | "insertion_start_date"
  | "insertion_end_date";

type ColumnGroup = "student" | "practice" | "insertion";
type ColumnDef = {
  key: SortKey;
  group: ColumnGroup;
  label: string;
  minWidth?: number;
  getSortValue: (row: InsercionesGroupedRow) => string | number;
  render: (row: InsercionesGroupedRow) => ReactNode;
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const FORMATION_FILTER_VALUES = ["ALL", "APTO", "NO APTO", "INSERCION"] as const;
const WORKING_FILTER_VALUES = ["ALL", "SI", "NO"] as const;

function asText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeSiNo(value: unknown): "SI" | "NO" {
  const normalized = asText(value).toUpperCase();
  if (["SI", "SÍ", "S", "1", "TRUE", "YES"].includes(normalized)) return "SI";
  return "NO";
}

function normalizeCourseStatus(value: unknown): "APTO" | "NO APTO" | "INSERCION" | "" {
  const normalized = asText(value).toUpperCase();
  if (!normalized) return "";
  if (normalized === "APTO") return "APTO";
  if (normalized === "NO APTO" || normalized === "NOAPTO") return "NO APTO";
  if (normalized.includes("INSER")) return "INSERCION";
  return "";
}

function courseStatusLabel(status: InsercionesGroupedRow["course_status"]): string {
  if (status === "INSERCION") return "INSERCIÓN";
  return status || "-";
}

function workingFromPractices(value: unknown): "SI" | "NO" {
  return asText(value).toUpperCase().includes("INSERCION") ? "SI" : "NO";
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
}

function joinInsertionValues(
  row: InsercionesGroupedRow,
  getValue: (insertion: InsercionItem) => string | number
): string {
  return row.inserciones.map((insertion) => String(getValue(insertion))).join(" | ");
}

function renderInsertionValues(
  row: InsercionesGroupedRow,
  getValue: (insertion: InsercionItem) => string,
  multiline = false
) {
  if (!row.inserciones.length) {
    return <Typography variant="body2">-</Typography>;
  }

  return (
    <Stack spacing={0.5}>
      {row.inserciones.map((insertion) => (
        <Typography
          key={insertion.insertion_id}
          variant="caption"
          sx={{
            display: "block",
            whiteSpace: multiline ? "pre-wrap" : "normal",
            wordBreak: "break-word",
            maxWidth: multiline ? 300 : "none",
          }}
        >
          {getValue(insertion) || "-"}
        </Typography>
      ))}
    </Stack>
  );
}

function parseRowsPerPage(value: string | null): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return 10;
  return ROWS_PER_PAGE_OPTIONS.includes(parsed) ? parsed : 10;
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export default function InsercionesReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<InsercionesApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get("q") ?? "";
  const formationFilter = FORMATION_FILTER_VALUES.includes(
    (searchParams.get("formation") as (typeof FORMATION_FILTER_VALUES)[number]) || "ALL"
  )
    ? ((searchParams.get("formation") as (typeof FORMATION_FILTER_VALUES)[number]) || "ALL")
    : "ALL";
  const workingFilter = WORKING_FILTER_VALUES.includes(
    (searchParams.get("working") as (typeof WORKING_FILTER_VALUES)[number]) || "ALL"
  )
    ? ((searchParams.get("working") as (typeof WORKING_FILTER_VALUES)[number]) || "ALL")
    : "ALL";
  const sectorFilter = searchParams.get("sector") || "ALL";
  const sortKey = (searchParams.get("sort") as SortKey) || "expediente";
  const sortDirection: SortDirection = searchParams.get("dir") === "desc" ? "desc" : "asc";
  const page = parsePage(searchParams.get("page"));
  const rowsPerPage = parseRowsPerPage(searchParams.get("size"));

  useEffect(() => {
    let cancel = false;

    api
      .get<InsercionesApiRow[]>("/stats/reports/inserciones")
      .then(({ data }) => {
        if (cancel) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (cancel) return;
        setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Error al cargar inserciones");
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    const scrollTopRaw = searchParams.get("scrollTop");
    const scrollLeftRaw = searchParams.get("scrollLeft");
    if (!scrollTopRaw && !scrollLeftRaw) return;
    if (loading) return;
    const tableContainer = tableScrollContainerRef.current;
    if (!tableContainer) return;

    const scrollTop = Number(scrollTopRaw || "0");
    const scrollLeft = Number(scrollLeftRaw || "0");
    if ((!Number.isFinite(scrollTop) || scrollTop < 0) && (!Number.isFinite(scrollLeft) || scrollLeft < 0)) {
      return;
    }

    const timer = window.setTimeout(() => {
      tableContainer.scrollTo({
        top: Number.isFinite(scrollTop) && scrollTop >= 0 ? scrollTop : 0,
        left: Number.isFinite(scrollLeft) && scrollLeft >= 0 ? scrollLeft : 0,
        behavior: "auto",
      });
    }, 0);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("scrollTop");
    nextParams.delete("scrollLeft");
    setSearchParams(nextParams, { replace: true });

    return () => window.clearTimeout(timer);
  }, [loading, searchParams, setSearchParams]);

  const groupedRows = useMemo<InsercionesGroupedRow[]>(() => {
    const map = new Map<string, InsercionesGroupedRow>();

    rows.forEach((apiRow) => {
      const expediente = asText(apiRow.expediente);
      if (!expediente) return;

      const existing = map.get(expediente);
      const baseRow =
        existing ??
        ({
          expediente,
          student_id: Number(apiRow.student_id),
          itinerary_name: asText(apiRow.itinerary_name),
          first_names: asText(apiRow.first_names),
          last_names: asText(apiRow.last_names),
          dni_nie: asText(apiRow.dni_nie),
          phone: asText(apiRow.phone),
          email: asText(apiRow.email),
          course_status: normalizeCourseStatus(apiRow.course_status),
          formation_end_date: asText(apiRow.formation_end_date),
          practice_company_name: asText(apiRow.practice_company_name),
          practice_start_date: asText(apiRow.practice_start_date),
          practice_end_date: asText(apiRow.practice_end_date),
          is_working: workingFromPractices(apiRow.practice_does_practices),
          practice_observations: asText(apiRow.practice_observations),
          inserciones: [],
        } satisfies InsercionesGroupedRow);

      const insertionId = Number(apiRow.insertion_id);
      if (Number.isFinite(insertionId)) {
        const alreadyExists = baseRow.inserciones.some((insertion) => insertion.insertion_id === insertionId);
        if (!alreadyExists) {
          baseRow.inserciones.push({
            insertion_id: insertionId,
            insertion_sector_name: asText(apiRow.insertion_sector_name),
            insertion_position: asText(apiRow.insertion_position),
            insertion_company_name: asText(apiRow.insertion_company_name),
            is_itinerary_company_contract: normalizeSiNo(apiRow.is_itinerary_company_contract),
            contract_code: asText(apiRow.contract_code),
            contract_type: asText(apiRow.contract_type),
            workday: asText(apiRow.workday),
            hiring_mode: asText(apiRow.hiring_mode),
            attached_contract: normalizeSiNo(apiRow.attached_contract),
            attached_work_life: normalizeSiNo(apiRow.attached_work_life),
            insertion_observations: asText(apiRow.insertion_observations),
            insertion_start_date: asText(apiRow.insertion_start_date),
            insertion_end_date: asText(apiRow.insertion_end_date),
          });
        }
      }

      map.set(expediente, baseRow);
    });

    return Array.from(map.values()).map((row) => ({
      ...row,
      inserciones: [...row.inserciones].sort((a, b) => {
        const byDate = b.insertion_start_date.localeCompare(a.insertion_start_date);
        if (byDate !== 0) return byDate;
        return b.insertion_id - a.insertion_id;
      }),
    }));
  }, [rows]);

  const columns = useMemo<ColumnDef[]>(
    () => [
      {
        key: "expediente",
        group: "student",
        label: "EXPEDIENTE",
        minWidth: 120,
        getSortValue: (row) => row.expediente,
        render: (row) => <Typography sx={{ fontWeight: 700 }}>{row.expediente}</Typography>,
      },
      {
        key: "itinerary_name",
        group: "student",
        label: "ITINERARIO",
        minWidth: 220,
        getSortValue: (row) => row.itinerary_name,
        render: (row) => <Typography variant="body2">{row.itinerary_name || "-"}</Typography>,
      },
      {
        key: "first_names",
        group: "student",
        label: "NOMBRE",
        minWidth: 160,
        getSortValue: (row) => row.first_names,
        render: (row) => <Typography variant="body2">{row.first_names || "-"}</Typography>,
      },
      {
        key: "last_names",
        group: "student",
        label: "APELLIDOS",
        minWidth: 190,
        getSortValue: (row) => row.last_names,
        render: (row) => <Typography variant="body2">{row.last_names || "-"}</Typography>,
      },
      {
        key: "dni_nie",
        group: "student",
        label: "DOC. IDENTIFICACIÓN",
        minWidth: 160,
        getSortValue: (row) => row.dni_nie,
        render: (row) => <Typography variant="body2">{row.dni_nie || "-"}</Typography>,
      },
      {
        key: "phone",
        group: "student",
        label: "TELÉFONO",
        minWidth: 130,
        getSortValue: (row) => row.phone,
        render: (row) => <Typography variant="body2">{row.phone || "-"}</Typography>,
      },
      {
        key: "email",
        group: "student",
        label: "EMAIL",
        minWidth: 220,
        getSortValue: (row) => row.email,
        render: (row) => <Typography variant="body2">{row.email || "-"}</Typography>,
      },
      {
        key: "course_status",
        group: "student",
        label: "FORMACIÓN",
        minWidth: 130,
        getSortValue: (row) => row.course_status,
        render: (row) => <Typography variant="body2">{courseStatusLabel(row.course_status)}</Typography>,
      },
      {
        key: "formation_end_date",
        group: "student",
        label: "FIN FORMACIÓN",
        minWidth: 150,
        getSortValue: (row) => row.formation_end_date,
        render: (row) => <Typography variant="body2">{formatDateDMY(row.formation_end_date)}</Typography>,
      },
      {
        key: "practice_company_name",
        group: "practice",
        label: "EMPRESA",
        minWidth: 200,
        getSortValue: (row) => row.practice_company_name,
        render: (row) => <Typography variant="body2">{row.practice_company_name || "-"}</Typography>,
      },
      {
        key: "practice_start_date",
        group: "practice",
        label: "INICIO PRÁCTICAS",
        minWidth: 160,
        getSortValue: (row) => row.practice_start_date,
        render: (row) => <Typography variant="body2">{formatDateDMY(row.practice_start_date)}</Typography>,
      },
      {
        key: "practice_end_date",
        group: "practice",
        label: "FIN PRÁCTICAS",
        minWidth: 150,
        getSortValue: (row) => row.practice_end_date,
        render: (row) => <Typography variant="body2">{formatDateDMY(row.practice_end_date)}</Typography>,
      },
      {
        key: "practice_offer",
        group: "practice",
        label: "PROPUESTA TRABAJO",
        minWidth: 160,
        getSortValue: () => "",
        render: () => <Typography variant="body2">-</Typography>,
      },
      {
        key: "practice_offer_acceptance",
        group: "practice",
        label: "ACEPTACIÓN PROPUESTA",
        minWidth: 180,
        getSortValue: () => "",
        render: () => <Typography variant="body2">-</Typography>,
      },
      {
        key: "practice_offer_observations",
        group: "practice",
        label: "OBS. PROPUESTA",
        minWidth: 180,
        getSortValue: () => "",
        render: () => <Typography variant="body2">-</Typography>,
      },
      {
        key: "is_working",
        group: "practice",
        label: "ESTÁ TRABAJANDO",
        minWidth: 150,
        getSortValue: (row) => row.is_working,
        render: (row) => <Typography variant="body2">{row.is_working}</Typography>,
      },
      {
        key: "worked_after_practices",
        group: "practice",
        label: "HA TRABAJADO DESPUÉS",
        minWidth: 180,
        getSortValue: () => "",
        render: () => <Typography variant="body2">-</Typography>,
      },
      {
        key: "practice_observations",
        group: "practice",
        label: "OBSERVACIONES",
        minWidth: 260,
        getSortValue: (row) => row.practice_observations,
        render: (row) => (
          <Typography variant="caption" sx={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word", maxWidth: 300 }}>
            {row.practice_observations || "-"}
          </Typography>
        ),
      },
      {
        key: "insertion_sector",
        group: "insertion",
        label: "SECTOR",
        minWidth: 180,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_sector_name),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.insertion_sector_name),
      },
      {
        key: "insertion_position",
        group: "insertion",
        label: "PUESTO",
        minWidth: 190,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_position),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.insertion_position),
      },
      {
        key: "insertion_company",
        group: "insertion",
        label: "EMPRESA",
        minWidth: 220,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_company_name),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.insertion_company_name),
      },
      {
        key: "is_itinerary_company_contract",
        group: "insertion",
        label: "CONTRATO EMPRESA ITINERARIO",
        minWidth: 220,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.is_itinerary_company_contract),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.is_itinerary_company_contract),
      },
      {
        key: "contract_code",
        group: "insertion",
        label: "CÓDIGO CONTRATO",
        minWidth: 160,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.contract_code),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.contract_code),
      },
      {
        key: "contract_type",
        group: "insertion",
        label: "TIPO CONTRATO",
        minWidth: 180,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.contract_type),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.contract_type),
      },
      {
        key: "workday",
        group: "insertion",
        label: "JORNADA",
        minWidth: 150,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.workday),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.workday),
      },
      {
        key: "hiring_mode",
        group: "insertion",
        label: "MODALIDAD",
        minWidth: 170,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.hiring_mode),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.hiring_mode),
      },
      {
        key: "attached_contract",
        group: "insertion",
        label: "ADJUNTA CONTRATO",
        minWidth: 150,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.attached_contract),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.attached_contract),
      },
      {
        key: "attached_work_life",
        group: "insertion",
        label: "ADJUNTA VIDA LABORAL",
        minWidth: 180,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.attached_work_life),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.attached_work_life),
      },
      {
        key: "insertion_observations",
        group: "insertion",
        label: "OBSERVACIONES",
        minWidth: 280,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_observations),
        render: (row) => renderInsertionValues(row, (insertion) => insertion.insertion_observations, true),
      },
      {
        key: "insertion_start_date",
        group: "insertion",
        label: "FECHA INICIO",
        minWidth: 150,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_start_date),
        render: (row) => renderInsertionValues(row, (insertion) => formatDateDMY(insertion.insertion_start_date)),
      },
      {
        key: "insertion_end_date",
        group: "insertion",
        label: "FECHA FIN",
        minWidth: 140,
        getSortValue: (row) => joinInsertionValues(row, (insertion) => insertion.insertion_end_date),
        render: (row) => renderInsertionValues(row, (insertion) => formatDateDMY(insertion.insertion_end_date)),
      },
    ],
    []
  );

  const columnMap = useMemo(() => {
    const map = new Map<SortKey, ColumnDef>();
    columns.forEach((column) => map.set(column.key, column));
    return map;
  }, [columns]);

  const groupCounts = useMemo(
    () => ({
      student: columns.filter((column) => column.group === "student").length,
      practice: columns.filter((column) => column.group === "practice").length,
      insertion: columns.filter((column) => column.group === "insertion").length,
    }),
    [columns]
  );

  const sectorOptions = useMemo(() => {
    const sectors = new Set<string>();
    groupedRows.forEach((row) => {
      row.inserciones.forEach((insertion) => {
        if (insertion.insertion_sector_name) sectors.add(insertion.insertion_sector_name);
      });
    });
    return Array.from(sectors).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [groupedRows]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return groupedRows.filter((row) => {
      if (formationFilter !== "ALL" && row.course_status !== formationFilter) return false;
      if (workingFilter !== "ALL" && row.is_working !== workingFilter) return false;
      if (sectorFilter !== "ALL" && !row.inserciones.some((insertion) => insertion.insertion_sector_name === sectorFilter)) {
        return false;
      }

      if (!needle) return true;

      const haystack = [
        row.expediente,
        row.itinerary_name,
        row.first_names,
        row.last_names,
        row.dni_nie,
        row.phone,
        row.email,
        row.practice_company_name,
        row.practice_observations,
        row.inserciones
          .map((insertion) =>
            [
              insertion.insertion_sector_name,
              insertion.insertion_position,
              insertion.insertion_company_name,
              insertion.contract_code,
              insertion.contract_type,
              insertion.workday,
              insertion.hiring_mode,
              insertion.insertion_observations,
            ].join(" ")
          )
          .join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [groupedRows, query, formationFilter, workingFilter, sectorFilter]);

  const safeSortKey = columnMap.has(sortKey) ? sortKey : "expediente";

  const sortedRows = useMemo(() => {
    const column = columnMap.get(safeSortKey);
    if (!column) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const compared = compareSortValues(column.getSortValue(a), column.getSortValue(b));
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [columnMap, filteredRows, safeSortKey, sortDirection]);

  const safePage = useMemo(() => {
    if (!sortedRows.length) return 0;
    const maxPage = Math.floor((sortedRows.length - 1) / rowsPerPage);
    return Math.min(page, maxPage);
  }, [page, rowsPerPage, sortedRows.length]);

  const paginatedRows = useMemo(() => {
    const start = safePage * rowsPerPage;
    return sortedRows.slice(start, start + rowsPerPage);
  }, [rowsPerPage, safePage, sortedRows]);

  const updateParams = (patch: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === "") nextParams.delete(key);
      else nextParams.set(key, value);
    });
    setSearchParams(nextParams, { replace: true });
  };

  const onRequestSort = (key: SortKey) => {
    const nextDirection: SortDirection = safeSortKey === key && sortDirection === "asc" ? "desc" : "asc";
    updateParams({ sort: key, dir: nextDirection, page: "0" });
  };

  const handleRowClick = (row: InsercionesGroupedRow) => {
    if (!Number.isFinite(row.student_id) || row.student_id <= 0) return;
    const nextParams = new URLSearchParams(searchParams);
    const tableContainer = tableScrollContainerRef.current;
    if (tableContainer) {
      nextParams.set("scrollTop", String(Math.round(tableContainer.scrollTop)));
      nextParams.set("scrollLeft", String(Math.round(tableContainer.scrollLeft)));
    }
    const queryString = nextParams.toString();
    const from = queryString ? `${location.pathname}?${queryString}` : location.pathname;
    navigate(`/students/${row.student_id}`, { state: { from } });
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        maxWidth: "100%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        bgcolor: (theme) => theme.palette.grey[50],
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          height: "100%",
          width: "100%",
          maxWidth: "100%",
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Stack spacing={2} sx={{ height: "100%", minHeight: 0, minWidth: 0, overflow: "hidden" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Inserciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cada fila representa un expediente y agrupa sus inserciones laborales.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", xl: "center" }}
            justifyContent="space-between"
            sx={{ minWidth: 0, maxWidth: "100%" }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              sx={{
                minWidth: 0,
                flex: 1,
                maxWidth: "100%",
                flexWrap: { md: "wrap" },
              }}
            >
              <TextField
                size="small"
                label="Buscar"
                placeholder="Expediente, alumno, empresa, DNI..."
                value={query}
                onChange={(event) => updateParams({ q: event.target.value || null, page: "0" })}
                sx={{ minWidth: { xs: 0, sm: 280 }, flex: "1 1 280px", maxWidth: "100%" }}
              />
              <TextField
                select
                size="small"
                label="Formación"
                value={formationFilter}
                onChange={(event) => updateParams({ formation: event.target.value === "ALL" ? null : event.target.value, page: "0" })}
                sx={{ minWidth: 180, flex: "1 1 180px" }}
              >
                <MenuItem value="ALL">Todas</MenuItem>
                <MenuItem value="APTO">APTO</MenuItem>
                <MenuItem value="NO APTO">NO APTO</MenuItem>
                <MenuItem value="INSERCION">INSERCIÓN</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Está trabajando"
                value={workingFilter}
                onChange={(event) => updateParams({ working: event.target.value === "ALL" ? null : event.target.value, page: "0" })}
                sx={{ minWidth: 170, flex: "1 1 170px" }}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="SI">SI</MenuItem>
                <MenuItem value="NO">NO</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Sector inserción"
                value={sectorFilter}
                onChange={(event) => updateParams({ sector: event.target.value === "ALL" ? null : event.target.value, page: "0" })}
                sx={{ minWidth: 220, flex: "1 1 220px" }}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                {sectorOptions.map((sector) => (
                  <MenuItem key={sector} value={sector}>
                    {sector}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Box sx={{ flexShrink: 0, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
              <TablePagination
                component="div"
                count={sortedRows.length}
                page={safePage}
                onPageChange={(_, nextPage) => updateParams({ page: String(nextPage) })}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(event) => updateParams({ size: event.target.value, page: "0" })}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
                sx={{
                  ".MuiTablePagination-toolbar": { minHeight: 44, pl: 0, pr: 0 },
                }}
              />
            </Box>
          </Stack>

          {error ? (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}

          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2,
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <TableContainer
              ref={tableScrollContainerRef}
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                maxHeight: "none",
                overflow: "auto",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <Table stickyHeader size="small" sx={{ minWidth: 5300 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" colSpan={groupCounts.student} sx={{ fontWeight: 900, bgcolor: "grey.100" }}>
                      DATOS DE ALUMNO Y FORMACIÓN
                    </TableCell>
                    <TableCell align="center" colSpan={groupCounts.practice} sx={{ fontWeight: 900, bgcolor: "grey.100" }}>
                      DATOS DE PRÁCTICAS
                    </TableCell>
                    <TableCell align="center" colSpan={groupCounts.insertion} sx={{ fontWeight: 900, bgcolor: "grey.100" }}>
                      DATOS DE INSERCIONES
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.key} sx={{ minWidth: column.minWidth ?? 140, whiteSpace: "nowrap" }}>
                        <TableSortLabel
                          active={safeSortKey === column.key}
                          direction={safeSortKey === column.key ? sortDirection : "asc"}
                          onClick={() => onRequestSort(column.key)}
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 5 }}>
                        Cargando inserciones…
                      </TableCell>
                    </TableRow>
                  ) : paginatedRows.length ? (
                    paginatedRows.map((row) => (
                      <TableRow
                        key={row.expediente}
                        hover
                        sx={{ cursor: Number.isFinite(row.student_id) && row.student_id > 0 ? "pointer" : "default" }}
                        onClick={() => handleRowClick(row)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleRowClick(row);
                          }
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell key={`${row.expediente}-${column.key}`}>{column.render(row)}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} align="center" sx={{ py: 5, color: "text.secondary" }}>
                        No hay datos para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Stack>
      </Paper>
    </Box>
  );
}
