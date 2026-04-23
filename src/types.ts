// Shared application types

export interface Student {
  id: number; // interno
  first_names: string;
  last_names: string;
  dni_nie: string;
  social_security_number?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  sex?: "mujer" | "hombre" | "other" | "unknown" | null;
  district_code?: number | null;
  municipality_code?: number | null;
  district?: string | null;
  municipality?: string | null;
  phone?: string | null;
  email?: string | null;
  tic?: "SI" | "NO" | null;
  status_laboral?: "Buscando empleo" | "Buscando mejorar empleo" | "Sin buscar empleo" | null;
  notes?: string | null;
}

export interface CompanyPracticeCenter {
  id: number;
  company_id: number;
  address?: string | null;
  sector?: string | null;
  center?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CompanySector {
  id: number;
  sector_name: string;
}

export interface LocationDistrict {
  code: number;
  municipality_code: number;
  name: string;
}

export interface LocationMunicipality {
  code: number;
  name: string;
}

export interface Company {
  id: number;
  cif?: string | null;
  name: string;
  fiscal_name?: string | null;
  sector_id?: number | null;
  sector_name?: string | null;
  sector?: string | null; // alias de compatibilidad devuelto por API
  company_email?: string | null;
  company_phone?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  // legacy fields (optional)
  contact_phone?: string | null;
  contact_date?: string | null;
  agreement_signed?: string | null;
  agreement_date?: string | null;
  agreement_code?: string | null;
  codigo_convenio?: string | null;
  required_position?: string | null;
  has_complex_practice_centers?: boolean | number | null;
  notes?: string | null;
}

export interface Vacancy {
  id: number;
  company_id: number;
  company_name?: string | null;
  company_fiscal_name?: string | null;
  practice_center_id?: number | null;
  practice_center_sector?: string | null;
  practice_center_name?: string | null;
  practice_center_address?: string | null;
  workplace?: string | null;
  title: string;
  sector?: string | null;
  description?: string | null;
  requirements?: string | null; // plain text
  horarios?: string | null;
  tipo_contrato?: string | null;
  sueldo_aproximado_bruto_anual?: number | null;
  status: "open" | "closed";
  created_at?: string | null; // ISO datetime (or MySQL Date)
}

export interface Internship {
  id: number;
  student_id: number;
  company_name: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
}

export interface Interview {
  id: number;
  student_id: number;
  place?: string | null;
  interview_date: string; // YYYY-MM-DD (schema)
  status?: "sent" | "attended" | "no_show" | null;
  notes?: string | null;
}
