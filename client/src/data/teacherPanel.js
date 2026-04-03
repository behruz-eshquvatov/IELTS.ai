export const teacherSummaryStats = [
  { label: "Active students", value: "48", helper: "Across 4 live cohorts" },
  { label: "Review queue", value: "12", helper: "Writing + manual checks" },
  { label: "Completion rate", value: "91%", helper: "This week's assignment cycle" },
  { label: "Flagged behavior", value: "3", helper: "Needs teacher follow-up" },
];

export const teacherAlerts = [
  {
    title: "Suspicious score jump in Blue Cohort",
    detail: "Rayan improved 1.5 band points in one reading attempt. Review timing and answer pattern.",
    tone: "amber",
  },
  {
    title: "Writing backlog needs review",
    detail: "Seven Task 2 essays are still waiting for manual scoring before tomorrow's lesson.",
    tone: "blue",
  },
  {
    title: "Weak listening trend",
    detail: "Map-labeling and multiple matching are underperforming in the evening class.",
    tone: "rose",
  },
];

export const teacherSkillDistribution = [
  { skill: "Listening", level: "Stable", detail: "Part 2 is improving, Part 3 still inconsistent." },
  { skill: "Reading", level: "Watch closely", detail: "Inference and heading-matching still drag average scores." },
  { skill: "Writing", level: "Needs review", detail: "Task response is rising, but cohesion remains uneven." },
  { skill: "Speaking", level: "Healthy", detail: "Fluency drills are translating well into mock interviews." },
];

export const teacherClasses = [
  {
    id: "blue-cohort",
    name: "Blue Cohort",
    schedule: "Mon / Wed / Fri - 18:30",
    startTime: "18:30",
    students: 14,
    averageBand: "6.1",
    completionRate: "93%",
    weakArea: "Reading inference",
    notes: "Strong attendance, but timed reading still causes avoidable drops.",
  },
  {
    id: "intensive-morning",
    name: "Intensive Morning",
    schedule: "Tue / Thu / Sat - 09:00",
    startTime: "09:00",
    students: 11,
    averageBand: "6.6",
    completionRate: "88%",
    weakArea: "Writing cohesion",
    notes: "High motivation group with slower essay organization under pressure.",
  },
  {
    id: "weekend-accelerator",
    name: "Weekend Accelerator",
    schedule: "Sat / Sun - 14:00",
    startTime: "14:00",
    students: 9,
    averageBand: "5.8",
    completionRate: "79%",
    weakArea: "Listening detail traps",
    notes: "Good energy, but homework consistency still needs structure.",
  },
  {
    id: "foundation-evening",
    name: "Foundation Evening",
    schedule: "Mon / Thu - 20:00",
    startTime: "20:00",
    students: 16,
    averageBand: "5.4",
    completionRate: "82%",
    weakArea: "Listening distractors",
    notes: "Stable turnout with a clear need for listening accuracy drills.",
  },
  {
    id: "writing-lab",
    name: "Writing Lab",
    schedule: "Wed / Fri - 16:00",
    startTime: "16:00",
    students: 8,
    averageBand: "6.9",
    completionRate: "95%",
    weakArea: "Task 1 overview",
    notes: "Small focused group doing well, but overview statements still slip.",
  },
  {
    id: "sprint-batch",
    name: "Sprint Batch",
    schedule: "Tue / Sat - 11:30",
    startTime: "11:30",
    students: 12,
    averageBand: "6.0",
    completionRate: "86%",
    weakArea: "Reading pacing",
    notes: "Fast-paced class that needs tighter time control in mock conditions.",
  },
];

export const teacherStudents = [
  {
    id: "amina-n",
    name: "Amina Nurmatova",
    className: "Blue Cohort",
    targetBand: "7.0",
    currentBand: "6.5",
    status: "On track",
    weakArea: "Reading inference",
    completionRate: "96%",
    lastSubmission: "Task 2 essay - 4h ago",
    notes: "Reliable finisher, but overthinks inference questions under time pressure.",
  },
  {
    id: "rayan-a",
    name: "Rayan Abdullaev",
    className: "Intensive Morning",
    targetBand: "7.5",
    currentBand: "6.8",
    status: "Flagged",
    weakArea: "Behavior anomaly",
    completionRate: "84%",
    lastSubmission: "Reading mock - 1d ago",
    notes: "Recent jump in reading score needs review against attempt timing and answer changes.",
  },
  {
    id: "sara-k",
    name: "Sara Karimova",
    className: "Weekend Accelerator",
    targetBand: "6.5",
    currentBand: "5.9",
    status: "Needs help",
    weakArea: "Writing cohesion",
    completionRate: "71%",
    lastSubmission: "Task 1 report - 2d ago",
    notes: "Good ideas, but structure breaks down in the second half of longer responses.",
  },
  {
    id: "diyor-r",
    name: "Diyor Rakhimov",
    className: "Blue Cohort",
    targetBand: "6.5",
    currentBand: "6.0",
    status: "Recovering",
    weakArea: "Listening map tasks",
    completionRate: "78%",
    lastSubmission: "Listening drill - 8h ago",
    notes: "Attendance returned to normal. Needs tighter review loops for map and labeling sections.",
  },
];

export const studentTimeline = [
  { label: "Mock exam", value: "6.5 overall", detail: "Best result in last 30 days" },
  { label: "Writing review", value: "Band 6.0", detail: "Task response improved, cohesion still unstable" },
  { label: "Homework streak", value: "11 days", detail: "Most consistent stretch this month" },
];

export const studentRecommendations = [
  "Assign one timed reading passage with inference focus before the next class.",
  "Review paragraph linking in the next writing feedback cycle.",
  "Keep the student in normal pacing; no intervention plan needed yet.",
];

export const teacherAssignments = [
  {
    title: "Task 2 - Opinion Essay",
    target: "Blue Cohort",
    section: "Writing",
    due: "Tomorrow, 20:00",
    submissions: "9 / 14",
    status: "In progress",
  },
  {
    title: "Reading - Matching Headings Sprint",
    target: "All active students",
    section: "Reading",
    due: "Today, 18:00",
    submissions: "31 / 48",
    status: "Due soon",
  },
  {
    title: "Listening Part 3 Correction Loop",
    target: "Weekend Accelerator",
    section: "Listening",
    due: "Friday, 12:00",
    submissions: "2 / 9",
    status: "Scheduled",
  },
];

export const teacherSubmissions = [
  {
    student: "Amina Nurmatova",
    work: "Task 2 essay",
    className: "Blue Cohort",
    submittedAt: "2h ago",
    priority: "High",
    issue: "Needs manual banding and paragraph-level comments",
  },
  {
    student: "Sara Karimova",
    work: "Task 1 report",
    className: "Weekend Accelerator",
    submittedAt: "5h ago",
    priority: "Medium",
    issue: "Cohesion and overview paragraph should be reviewed",
  },
  {
    student: "Rayan Abdullaev",
    work: "Reading mock",
    className: "Intensive Morning",
    submittedAt: "1d ago",
    priority: "Critical",
    issue: "Check suspicious timing pattern before score approval",
  },
];

export const teacherReports = [
  {
    title: "Monthly class performance",
    summary: "Blue Cohort holds the strongest completion trend, while weekend learners need tighter scheduling.",
  },
  {
    title: "Weak-skill distribution",
    summary: "Reading inference and writing cohesion remain the two biggest drag areas across teacher-managed groups.",
  },
  {
    title: "Institution report draft",
    summary: "Attendance quality is stable, but manual review capacity needs expansion before cohort growth.",
  },
];

export const settingsSections = [
  {
    title: "Profile settings",
    items: ["Display name", "Bio and teaching focus", "Timezone and lesson availability"],
  },
  {
    title: "Notification settings",
    items: ["Submission review alerts", "Overdue assignment nudges", "Suspicious behavior escalations"],
  },
  {
    title: "Grading preferences",
    items: ["Default writing rubric", "Comment templates", "Auto-flag thresholds"],
  },
];
