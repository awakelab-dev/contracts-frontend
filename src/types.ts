// Shared application types

export interface Student {
  id: number; // Nº Expediente
  first_names: string;
  last_names: string;
  dni_nie: string;
  social_security_number?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  employment_status: string; // 'unemployed' | 'employed' | 'improved' | 'unknown'
}

export interface Company {
  id: number;
  nif?: string | null;
  name: string;
  company_email?: string | null;
  company_phone?: string | null;
  sector?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  // legacy fields (optional)
  contact_phone?: string | null;
  notes?: string | null;
}

export interface Vacancy {
  id: number;
  company_id: number;
  title: string;
  sector?: string | null;
  description?: string | null;
  requirements?: string | null; // plain text
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
