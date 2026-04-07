import api from "../lib/api";
import type { LocationDistrict, LocationMunicipality } from "../types";

export async function fetchMunicipalities(): Promise<LocationMunicipality[]> {
  const { data } = await api.get<LocationMunicipality[]>("/locations/municipalities");
  return Array.isArray(data) ? data : [];
}

export async function fetchDistricts(municipalityCode?: string | number | null): Promise<LocationDistrict[]> {
  const { data } = await api.get<LocationDistrict[]>("/locations/districts", {
    params: municipalityCode ? { municipality_code: municipalityCode } : undefined,
  });
  return Array.isArray(data) ? data : [];
}
