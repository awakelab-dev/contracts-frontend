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
  // Nota: course_code ya no está en students; los cursos van en student_courses.
  // Por ahora: priorizamos disponibilidad (employment_status) y un pequeño bonus si hay datos completos.
  const status = (student.employment_status || "").toLowerCase();
  const availabilityMatch = status === "unemployed" ? 1 : 0;

  const hasDistrict = !!normalize(student.district || "");
  const hasSector = !!normalize(vacancy.sector || "");
  const completenessBonus = hasDistrict && hasSector ? 10 : 0;

  const score = Math.min(100, availabilityMatch ? 40 + completenessBonus : 0);
  return score;
}

export function scoreColor(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success"; // verde
  if (score > 50) return "warning"; // naranja
  return "error"; // rojo
}
