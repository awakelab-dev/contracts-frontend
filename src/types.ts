// Shared application types

export interface Student {
  id: number;
  full_name: string;
  dni_nie: string;
  course_code: string;
  employment_status: string; // 'unemployed' | 'employed' | 'improved' | 'unknown'
  email?: string;
  phone?: string;
}

export interface Company {
  id: number;
  name: string;
  sector?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
}

export interface Vacancy {
  id: number;
  company_id: number;
  title: string;
  sector?: string | null;
  requirements?: string | null; // plain text
  status: "open" | "closed";
  deadline?: string | null; // ISO date (YYYY-MM-DD)
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
  notes?: string | null;
}
