import { apiRequest } from "../lib/apiClient";

function withBinaryHeaders(file, fileHeaderKey, fallbackName) {
  return {
    "Content-Type": file?.type || "application/octet-stream",
    [fileHeaderKey]: file?.name || fallbackName,
  };
}

export async function uploadSuperAdminBinary(path, file, fileHeaderKey, fallbackName) {
  return apiRequest(path, {
    method: "POST",
    auth: false,
    headers: withBinaryHeaders(file, fileHeaderKey, fallbackName),
    body: file,
  });
}

export async function uploadListeningAudio(path, file) {
  return uploadSuperAdminBinary(path, file, "X-Audio-Filename", `audio-${Date.now()}.mp3`);
}

export async function extractSuperAdminFromImage(path, file) {
  return uploadSuperAdminBinary(path, file, "X-Image-Filename", `image-${Date.now()}.png`);
}

export async function uploadWritingTask1Visual(path, file) {
  return uploadSuperAdminBinary(path, file, "X-Visual-Filename", `writing-task1-${Date.now()}.png`);
}
