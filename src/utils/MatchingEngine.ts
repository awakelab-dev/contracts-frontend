import type { Student, Vacancy } from "../types";

function normalize(input: string | null | undefined): string {
  if (!input) return "";
  // Uppercase, remove diacritics, keep only A-Z0-9
  return input
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function computeMatchingScore(student: Student, vacancy: Vacancy): number {
  // SectorMatch: 1 si course_code coincide con el sector (normalizado)
  const code = normalize(student.course_code);
  const sector = normalize(vacancy.sector || "");
  const sectorMatch = code && sector && code === sector ? 1 : 0;

  // AvailabilityMatch: 1 si employment_status = 'unemployed'
  const status = (student.employment_status || '').toLowerCase();
  const availabilityMatch = status === 'unemployed' ? 1 : 0;

  const score = Math.min(100, Math.round(sectorMatch * 60 + availabilityMatch * 40));
  return score;
}

export function scoreColor(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success"; // verde
  if (score > 50) return "warning"; // naranja
  return "error"; // rojo
}
