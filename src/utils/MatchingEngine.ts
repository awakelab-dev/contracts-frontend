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

  const hasDistrict = !!normalize(student.district || "");
  const hasMunicipality = !!normalize(student.municipality || "");
  const hasSector = !!normalize(vacancy.sector || "");
  if (hasDistrict && hasSector) return 70;
  if (hasMunicipality && hasSector) return 60;
  if (hasSector) return 55;
  return 0;
}

export function scoreColor(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success"; // verde
  if (score > 50) return "warning"; // naranja
  return "error"; // rojo
}
