import { API_BASE_URL } from "./apiClient";

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";

export const SUPER_ADMIN_PASSWORD = String(
  import.meta.env.VITE_SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD,
);

function normalizePathSuffix(pathSuffix = "") {
  if (!pathSuffix) {
    return "";
  }

  return pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
}

export function isValidSuperAdminPassword(password) {
  return String(password || "") === SUPER_ADMIN_PASSWORD;
}

export function deriveAudioIdFromFileName(fileName) {
  const safeName = String(fileName || "").trim();
  const pathSegments = safeName.split(/[/\\]/g);
  const baseName = pathSegments[pathSegments.length - 1] || "";
  return baseName.replace(/\.[^/.]+$/, "").trim();
}

export function buildSuperAdminPagePath(password, pathSuffix = "") {
  return `/super-admin/${encodeURIComponent(String(password || ""))}${normalizePathSuffix(pathSuffix)}`;
}

export function buildSuperAdminApiPath(password, pathSuffix = "") {
  return `/super-admin/${encodeURIComponent(String(password || ""))}${normalizePathSuffix(pathSuffix)}`;
}

export function buildListeningStreamUrl(password, audioId) {
  return `${API_BASE_URL}${buildSuperAdminApiPath(
    password,
    `/listening/${encodeURIComponent(String(audioId || ""))}/stream`,
  )}`;
}
