import { teacherClasses, teacherStudents } from "../data/teacherPanel";

export const CUSTOM_TEACHER_CLASSES_STORAGE_KEY = "teacher:custom-classes";
export const CUSTOM_TEACHER_STUDENTS_STORAGE_KEY = "teacher:custom-students";
export const TEACHER_STUDENT_MEMBERSHIPS_STORAGE_KEY = "teacher:student-memberships";

const supplementalTeacherStudents = [
  {
    id: "madina-p",
    name: "Madina Pulatova",
    className: "Intensive Morning",
    targetBand: "6.5",
    currentBand: "6.0",
    status: "On track",
    weakArea: "Reading timing",
    completionRate: "83%",
    lastSubmission: "Listening drill - 1d ago",
    notes: "Recently joined the morning cohort and is settling into the class pace.",
  },
  {
    id: "aziz-k",
    name: "Aziz Kamilov",
    className: "Weekend Accelerator",
    targetBand: "6.0",
    currentBand: "5.6",
    status: "Recovering",
    weakArea: "Listening detail traps",
    completionRate: "76%",
    lastSubmission: "Reading practice - 12h ago",
    notes: "Needs a little more structure after moving into the weekend group.",
  },
];

function readJsonStorage(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

export function readCustomTeacherClasses() {
  const savedValue = readJsonStorage(CUSTOM_TEACHER_CLASSES_STORAGE_KEY, []);
  return Array.isArray(savedValue) ? savedValue : [];
}

export function writeCustomTeacherClasses(classes) {
  writeJsonStorage(CUSTOM_TEACHER_CLASSES_STORAGE_KEY, classes);
}

export function readCustomTeacherStudents() {
  const savedValue = readJsonStorage(CUSTOM_TEACHER_STUDENTS_STORAGE_KEY, []);
  return Array.isArray(savedValue) ? savedValue : [];
}

export function writeCustomTeacherStudents(students) {
  writeJsonStorage(CUSTOM_TEACHER_STUDENTS_STORAGE_KEY, students);
}

export function getAllTeacherClasses() {
  return [...teacherClasses, ...readCustomTeacherClasses()];
}

export function getTeacherStudentCatalog() {
  return [...teacherStudents, ...supplementalTeacherStudents, ...readCustomTeacherStudents()];
}

export function buildDefaultTeacherStudentMemberships() {
  const classIdByName = new Map(teacherClasses.map((classroom) => [classroom.name, classroom.id]));

  return getTeacherStudentCatalog().reduce((memberships, student) => {
    memberships[student.id] = classIdByName.get(student.className) ?? null;
    return memberships;
  }, {});
}

export function readTeacherStudentMemberships() {
  const savedValue = readJsonStorage(TEACHER_STUDENT_MEMBERSHIPS_STORAGE_KEY, {});

  if (!savedValue || typeof savedValue !== "object" || Array.isArray(savedValue)) {
    return {};
  }

  return savedValue;
}

export function writeTeacherStudentMemberships(memberships) {
  writeJsonStorage(TEACHER_STUDENT_MEMBERSHIPS_STORAGE_KEY, memberships);
}

export function resolveTeacherStudentsWithClassIds() {
  const memberships = {
    ...buildDefaultTeacherStudentMemberships(),
    ...readTeacherStudentMemberships(),
  };
  const classNameById = new Map(getAllTeacherClasses().map((classroom) => [classroom.id, classroom.name]));

  return getTeacherStudentCatalog().map((student) => {
    const classId = Object.prototype.hasOwnProperty.call(memberships, student.id)
      ? memberships[student.id]
      : null;

    return {
      ...student,
      classId,
      className: classId ? classNameById.get(classId) ?? student.className : "Unassigned",
    };
  });
}

function slugifyClassName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildNewTeacherClass({ name, startTime }, existingClasses = getAllTeacherClasses()) {
  const baseId = slugifyClassName(name) || `class-${Date.now()}`;
  const existingIds = new Set(existingClasses.map((classroom) => classroom.id));
  let candidateId = baseId;
  let suffix = 2;

  while (existingIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    id: candidateId,
    name,
    schedule: `Custom lesson - ${startTime}`,
    startTime,
    students: 0,
    averageBand: "--",
    completionRate: "--",
    weakArea: "No data yet",
    notes: "New class created. Add students when you are ready to start the classroom.",
  };
}
