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
