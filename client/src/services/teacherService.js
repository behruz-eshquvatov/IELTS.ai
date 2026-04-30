import { apiRequest } from "../lib/apiClient";

export function listTeacherClasses() {
  return apiRequest("/teacher/classes");
}

export function createTeacherClass(payload) {
  return apiRequest("/teacher/classes", {
    method: "POST",
    body: payload,
  });
}

export function updateTeacherClass(classId, payload) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}`, {
    method: "PUT",
    body: payload,
  });
}

export function getTeacherClassOverview(classId) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}/overview`);
}

export function getTeacherClassHomeworkUnits(classId) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}/homework-units`);
}

export function getTeacherClassUnitHomework(classId, unitId) {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/units/${encodeURIComponent(String(unitId || ""))}/homework`,
  );
}

export function listTeacherClassStudents(classId) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}/students`);
}

export function searchTeacherClassStudents(classId, query = "") {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/search?q=${encodeURIComponent(String(query || ""))}`,
  );
}

export function inviteStudentToTeacherClass(classId, studentId) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/invite`, {
    method: "POST",
    body: { studentId },
  });
}

export function removeStudentFromTeacherClass(classId, studentId) {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/${encodeURIComponent(String(studentId || ""))}`,
    {
      method: "DELETE",
    },
  );
}

export function sendTeacherClassMessage(classId, message) {
  return apiRequest(`/teacher/classes/${encodeURIComponent(String(classId || ""))}/message`, {
    method: "POST",
    body: { message },
  });
}

export function getTeacherStudentProgress(classId, studentId) {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/${encodeURIComponent(String(studentId || ""))}/progress`,
  );
}

export function getTeacherStudentAttempts(classId, studentId) {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/${encodeURIComponent(String(studentId || ""))}/attempts`,
  );
}

export function getTeacherStudentAnalytics(classId, studentId) {
  return apiRequest(
    `/teacher/classes/${encodeURIComponent(String(classId || ""))}/students/${encodeURIComponent(String(studentId || ""))}/analytics`,
  );
}

export function getTeacherNotifications() {
  return apiRequest("/teacher/notifications");
}

export function markTeacherNotificationRead(notificationId) {
  return apiRequest(`/teacher/notifications/${encodeURIComponent(String(notificationId || ""))}/read`, {
    method: "PATCH",
  });
}

export function listTeacherStudents(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return apiRequest(`/teacher/students${query ? `?${query}` : ""}`);
}

export function getTeacherProfile() {
  return apiRequest("/teacher/me/profile");
}

export function updateTeacherProfile(payload) {
  return apiRequest("/teacher/me/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function updateTeacherPassword(payload) {
  return apiRequest("/teacher/me/profile/password", {
    method: "PATCH",
    body: payload,
  });
}
