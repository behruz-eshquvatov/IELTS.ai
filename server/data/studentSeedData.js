function generateActivityData(length) {
  return Array.from({ length }, (_, i) => {
    const dayOfWeek = i % 7;
    const cycle = Math.sin(i / 11);

    if (dayOfWeek === 6) return 0;
    if (cycle > 0.6) return 3;
    if (cycle > 0.1) return 2;
    if (dayOfWeek === 5) return 1;
    return i % 3 === 0 ? 1 : 0;
  });
}

const overviewByRange = {
  week: {
    scoreTitle: "Overall score",
    scoreBody: "Momentum is building from consistent listening + reading practice.",
    scoreTrend: "+0.5 vs last week",
    scoreTrendUp: true,
    scoreValue: "7.5",
    timeTitle: "Time spent",
    timeBody: "Slightly lower study time than last week, but accuracy stayed stable.",
    timeTrend: "12% less",
    timeTrendUp: false,
    timeValue: "7h 32m",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Listening shows repeated errors in ", bold: false },
          { text: "map labeling", bold: true },
          { text: ". You missed ", bold: false },
          { text: "12", bold: true },
          { text: " items this week, mostly in Section 2 form completion.", bold: false },
        ],
        mistakes: 12,
        suggestion: "Map Labelling Sprint.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Reading accuracy dips in ", bold: false },
          { text: "matching headings", bold: true },
          { text: ". You missed ", bold: false },
          { text: "9", bold: true },
          { text: " answers this week, mainly under time pressure.", bold: false },
        ],
        mistakes: 9,
        suggestion: "Heading Match Accelerator.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Writing shows structure issues in ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ". You made ", bold: false },
          { text: "7", bold: true },
          { text: " critical errors this week, mostly in paragraph flow.", bold: false },
        ],
        mistakes: 7,
        suggestion: "Task 2 Cohesion micro-course.",
      },
    ],
  },
  month: {
    scoreTitle: "Overall score",
    scoreBody: "Monthly trend is stronger with better consistency in test completion.",
    scoreTrend: "+0.8 vs last month",
    scoreTrendUp: true,
    scoreValue: "7.8",
    timeTitle: "Time spent",
    timeBody: "Total study time increased this month, and score volatility dropped.",
    timeTrend: "18% more",
    timeTrendUp: true,
    timeValue: "31h 18m",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Listening still struggles with ", bold: false },
          { text: "map labeling", bold: true },
          { text: ". You missed ", bold: false },
          { text: "34", bold: true },
          { text: " items this month, mostly in direction-heavy tasks.", bold: false },
        ],
        mistakes: 34,
        suggestion: "4-week Map + Form completion ladder.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Reading weakness remains in ", bold: false },
          { text: "matching headings", bold: true },
          { text: ". You missed ", bold: false },
          { text: "31", bold: true },
          { text: " answers this month across late passages.", bold: false },
        ],
        mistakes: 31,
        suggestion: "Weekly Heading logic sprint.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Writing needs work in ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ". You made ", bold: false },
          { text: "28", bold: true },
          { text: " critical errors this month in flow and linking.", bold: false },
        ],
        mistakes: 28,
        suggestion: "Cohesion repair plan (4 weeks).",
      },
    ],
  },
  lifetime: {
    scoreTitle: "Overall score",
    scoreBody: "Lifetime performance shows steady growth with stronger control in all sections.",
    scoreTrend: "+1.4 all-time",
    scoreTrendUp: true,
    scoreValue: "8.1",
    timeTitle: "Time spent",
    timeBody: "Long-term practice volume is high and supports stable scoring outcomes.",
    timeTrend: "412h total",
    timeTrendUp: true,
    timeValue: "412h",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Lifetime listening errors are highest in ", bold: false },
          { text: "map labeling", bold: true },
          { text: ", with ", bold: false },
          { text: "94", bold: true },
          { text: " mistakes accumulated across full tests.", bold: false },
        ],
        mistakes: 94,
        suggestion: "Long-cycle listening recovery track.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Lifetime reading bottleneck is ", bold: false },
          { text: "matching headings", bold: true },
          { text: ", with ", bold: false },
          { text: "90", bold: true },
          { text: " misses, especially in abstract passages.", bold: false },
        ],
        mistakes: 90,
        suggestion: "Reading precision master path.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Lifetime writing issue remains ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ", with ", bold: false },
          { text: "84", bold: true },
          { text: " critical mistakes across essays.", bold: false },
        ],
        mistakes: 84,
        suggestion: "Advanced cohesion + structure sequence.",
      },
    ],
  },
};

const weakByRangeAndPart = {
  week: {
    Listening: [
      { label: "Map labeling", mistakes: 12 },
      { label: "Form completion", mistakes: 10 },
      { label: "Multiple choice distractors", mistakes: 8 },
      { label: "Sentence completion", mistakes: 6 },
      { label: "Speaker matching", mistakes: 5 },
      { label: "Other", mistakes: 4 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 9 },
      { label: "True/False/Not Given", mistakes: 7 },
      { label: "Sentence completion", mistakes: 6 },
      { label: "Summary completion", mistakes: 5 },
      { label: "Paragraph matching", mistakes: 4 },
      { label: "Other", mistakes: 3 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 7 },
      { label: "Argument development", mistakes: 6 },
      { label: "Grammar range", mistakes: 5 },
      { label: "Task 1 overview clarity", mistakes: 5 },
      { label: "Data grouping", mistakes: 4 },
      { label: "Other", mistakes: 3 },
    ],
  },
  month: {
    Listening: [
      { label: "Map labeling", mistakes: 34 },
      { label: "Multiple choice distractors", mistakes: 29 },
      { label: "Form completion", mistakes: 25 },
      { label: "Sentence completion", mistakes: 21 },
      { label: "Speaker matching", mistakes: 18 },
      { label: "Other", mistakes: 14 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 31 },
      { label: "True/False/Not Given", mistakes: 24 },
      { label: "Summary completion", mistakes: 21 },
      { label: "Sentence completion", mistakes: 17 },
      { label: "Paragraph matching", mistakes: 14 },
      { label: "Other", mistakes: 10 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 28 },
      { label: "Argument development", mistakes: 22 },
      { label: "Grammar range", mistakes: 20 },
      { label: "Task 1 overview clarity", mistakes: 19 },
      { label: "Data grouping", mistakes: 16 },
      { label: "Other", mistakes: 12 },
    ],
  },
  lifetime: {
    Listening: [
      { label: "Map labeling", mistakes: 94 },
      { label: "Multiple choice distractors", mistakes: 88 },
      { label: "Form completion", mistakes: 81 },
      { label: "Sentence completion", mistakes: 73 },
      { label: "Speaker matching", mistakes: 65 },
      { label: "Other", mistakes: 51 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 90 },
      { label: "True/False/Not Given", mistakes: 76 },
      { label: "Summary completion", mistakes: 72 },
      { label: "Sentence completion", mistakes: 63 },
      { label: "Paragraph matching", mistakes: 58 },
      { label: "Other", mistakes: 45 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 84 },
      { label: "Argument development", mistakes: 79 },
      { label: "Grammar range", mistakes: 75 },
      { label: "Task 1 overview clarity", mistakes: 68 },
      { label: "Data grouping", mistakes: 62 },
      { label: "Other", mistakes: 49 },
    ],
  },
};

const bandByRange = {
  week: [
    { label: "Mon", band: 6.5 },
    { label: "Tue", band: 6.0 },
    { label: "Wed", band: 7.0 },
    { label: "Thu", band: 6.5 },
    { label: "Fri", band: 7.5 },
    { label: "Sat", band: 7.0 },
    { label: "Sun", band: 6.5 },
  ],
  month: [
    { label: "W1", band: 6.5 },
    { label: "W2", band: 6.8 },
    { label: "W3", band: 7.1 },
    { label: "W4", band: 7.0 },
  ],
  lifetime: [
    { label: "2024", band: 6.2 },
    { label: "2025", band: 6.8 },
    { label: "2026", band: 7.1 },
  ],
};

const timeByRange = {
  week: [
    { label: "Mon", minutes: 68 },
    { label: "Tue", minutes: 52 },
    { label: "Wed", minutes: 81 },
    { label: "Thu", minutes: 74 },
    { label: "Fri", minutes: 95 },
    { label: "Sat", minutes: 86 },
    { label: "Sun", minutes: 46 },
  ],
  month: [
    { label: "W1", minutes: 340 },
    { label: "W2", minutes: 390 },
    { label: "W3", minutes: 420 },
    { label: "W4", minutes: 405 },
  ],
  lifetime: [
    { label: "2024", minutes: 210 },
    { label: "2025", minutes: 278 },
    { label: "2026", minutes: 312 },
  ],
};

const studentProfileSeed = {
  fullName: "Amina Jurayeva",
  email: "amina@example.com",
  memberSince: "January 2026",
  subscription: {
    planName: "Student subscription",
    monthlyPrice: 19,
    teacherMonthlyPrice: 39,
    status: "Active subscription",
    benefits: [
      "Skill-based Listening, Reading, and Writing practice",
      "Structured feedback with weak-pattern visibility",
      "Progress tracking, timing behavior, and retry history",
    ],
  },
  paymentMethod: {
    cardMasked: "**** **** **** 4821",
    label: "Primary payment method",
  },
  security: {
    passwordMasked: "************",
    lastUpdatedLabel: "Last updated 24 days ago",
  },
  billingHistory: [
    { invoiceId: "INV-2482", date: "Mar 28, 2026", amount: "$19.00", status: "Paid" },
    { invoiceId: "INV-2410", date: "Feb 28, 2026", amount: "$19.00", status: "Paid" },
    { invoiceId: "INV-2339", date: "Jan 28, 2026", amount: "$19.00", status: "Paid" },
    { invoiceId: "INV-2264", date: "Dec 28, 2025", amount: "$19.00", status: "Paid" },
  ],
};

const studentDailyTasksSeed = {
  units: [
    {
      unitId: "unit-1",
      unit: "Unit 1",
      status: "completed",
      summary: "",
      band: "7.0",
      timeSpent: "1h 38m",
      tasks: [
        {
          taskId: "u1-listening",
          label: "Listening: Section 2 - Multiple choice",
          kind: "Lesson",
          to: "/student/tests/listening",
          status: "completed",
        },
        {
          taskId: "u1-reading",
          label: "Reading: Passage 1 - Urban migration",
          kind: "Lesson",
          to: "/student/tests/reading",
          status: "completed",
        },
        {
          taskId: "u1-writing-1",
          label: "Writing Task 1: Rail network comparison",
          kind: "Document",
          to: "/student/tests/writingTask1",
          status: "completed",
        },
        {
          taskId: "u1-writing-2",
          label: "Writing Task 2: Public transport funding",
          kind: "Document",
          to: "/student/tests/writingTask2",
          status: "completed",
        },
      ],
      attempts: [
        {
          attemptId: "u1-a1",
          label: "Attempt 1",
          band: "6.5",
          time: "1h 55m",
          date: "Mar 25",
          breakdown: "L6.5 / R6.5 / W6.0",
        },
        {
          attemptId: "u1-a2",
          label: "Attempt 2",
          band: "7.0",
          time: "1h 38m",
          date: "Mar 27",
          breakdown: "L7.5 / R7.0 / W6.5",
        },
      ],
    },
    {
      unitId: "unit-2",
      unit: "Unit 2",
      status: "completed",
      summary: "",
      band: "7.5",
      timeSpent: "1h 46m",
      tasks: [
        {
          taskId: "u2-listening",
          label: "Listening: Section 4 - Lecture notes",
          kind: "Lesson",
          to: "/student/tests/listening",
          status: "completed",
        },
        {
          taskId: "u2-reading",
          label: "Reading: Passage 3 - Ocean habitats",
          kind: "Lesson",
          to: "/student/tests/reading",
          status: "completed",
        },
        {
          taskId: "u2-writing-1",
          label: "Writing Task 1: Energy usage chart",
          kind: "Document",
          to: "/student/tests/writingTask1",
          status: "completed",
        },
        {
          taskId: "u2-writing-2",
          label: "Writing Task 2: Technology in classrooms",
          kind: "Document",
          to: "/student/tests/writingTask2",
          status: "completed",
        },
      ],
      attempts: [
        {
          attemptId: "u2-a1",
          label: "Attempt 1",
          band: "6.5",
          time: "2h 04m",
          date: "Mar 29",
          breakdown: "L6.5 / R6.0 / W6.0",
        },
        {
          attemptId: "u2-a2",
          label: "Attempt 2",
          band: "7.0",
          time: "1h 50m",
          date: "Mar 31",
          breakdown: "L7.0 / R7.0 / W6.5",
        },
        {
          attemptId: "u2-a3",
          label: "Attempt 3",
          band: "7.5",
          time: "1h 46m",
          date: "Apr 1",
          breakdown: "L8.0 / R7.5 / W7.0",
        },
      ],
    },
    {
      unitId: "unit-3",
      unit: "Unit 3",
      status: "today",
      summary: "Est. 1h 20m",
      estTime: "1h 20m",
      tasks: [
        {
          taskId: "u3-listening",
          label: "Listening: Section 3 - Map completion",
          kind: "Lesson",
          to: "/student/tests/listening",
          status: "pending",
        },
        {
          taskId: "u3-reading",
          label: "Reading: Passage 2 - Climate adaptation",
          kind: "Lesson",
          to: "/student/tests/reading",
          status: "pending",
        },
        {
          taskId: "u3-writing-1",
          label: "Writing Task 1: City center redevelopment plan",
          kind: "Document",
          to: "/student/tests/writingTask1",
          status: "pending",
        },
        {
          taskId: "u3-writing-2",
          label: "Writing Task 2: Remote work and productivity",
          kind: "Document",
          to: "/student/tests/writingTask2",
          status: "pending",
        },
      ],
    },
    {
      unitId: "unit-4",
      unit: "Unit 4",
      status: "locked",
      tasksCount: 3,
      lockHint: "Complete Unit 3 to unlock",
    },
    {
      unitId: "unit-5",
      unit: "Unit 5",
      status: "locked",
      tasksCount: 2,
      lockHint: "Unlocks after Unit 4",
    },
    {
      unitId: "unit-6",
      unit: "Unit 6",
      status: "locked",
      tasksCount: 3,
      lockHint: "Unlocks after Unit 5",
    },
    {
      unitId: "unit-7",
      unit: "Unit 7",
      status: "locked",
      tasksCount: 2,
      lockHint: "Unlocks after Unit 6",
    },
    {
      unitId: "unit-8",
      unit: "Unit 8",
      status: "locked",
      tasksCount: 4,
      lockHint: "Unlocks after Unit 7",
    },
    {
      unitId: "unit-9",
      unit: "Unit 9",
      status: "locked",
      tasksCount: 3,
      lockHint: "Unlocks after Unit 8",
    },
    {
      unitId: "unit-10",
      unit: "Unit 10",
      status: "locked",
      tasksCount: 2,
      lockHint: "Unlocks after Unit 9",
    },
  ],
};

const studentAnalyticsSeed = {
  ranges: {
    week: {
      overview: overviewByRange.week,
      bandChart: bandByRange.week,
      timeChart: timeByRange.week,
      weakSections: weakByRangeAndPart.week,
    },
    month: {
      overview: overviewByRange.month,
      bandChart: bandByRange.month,
      timeChart: timeByRange.month,
      weakSections: weakByRangeAndPart.month,
    },
    lifetime: {
      overview: overviewByRange.lifetime,
      bandChart: bandByRange.lifetime,
      timeChart: timeByRange.lifetime,
      weakSections: weakByRangeAndPart.lifetime,
    },
  },
  heatmap: {
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
    activityData: generateActivityData(365),
  },
};

module.exports = {
  studentProfileSeed,
  studentDailyTasksSeed,
  studentAnalyticsSeed,
};
