function toDateOnly(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeekSunday(dateInput) {
  const date = toDateOnly(dateInput);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function endOfWeekSaturday(dateInput) {
  const sunday = startOfWeekSunday(dateInput);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return saturday;
}

function diffDays(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

function getDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildBlankCalendarHeatmap(yearInput = new Date().getFullYear()) {
  const fallbackYear = new Date().getFullYear();
  const parsedYear = Number.parseInt(String(yearInput), 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : fallbackYear;
  const firstDayOfYear = toDateOnly(new Date(year, 0, 1));
  const lastDayOfYear = toDateOnly(new Date(year, 11, 31));
  const rangeStart = startOfWeekSunday(firstDayOfYear);
  const rangeEnd = endOfWeekSaturday(lastDayOfYear);
  const totalDays = diffDays(rangeStart, rangeEnd) + 1;

  const activityData = [];
  const visibilityData = [];
  for (let i = 0; i < totalDays; i += 1) {
    const day = new Date(rangeStart);
    day.setDate(rangeStart.getDate() + i);
    const isInsideCurrentYear = day >= firstDayOfYear && day <= lastDayOfYear;
    visibilityData.push(isInsideCurrentYear);
    activityData.push(0);
  }

  const monthTicks = Array.from({ length: 12 }, (_, monthIndex) => {
    const firstOfMonth = toDateOnly(new Date(year, monthIndex, 1));
    return {
      label: firstOfMonth.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      column: Math.floor(diffDays(rangeStart, firstOfMonth) / 7),
    };
  });

  return {
    months: monthTicks.map((tick) => tick.label),
    monthTicks,
    activityData,
    visibilityData,
    calendarYear: year,
    startDateKey: getDateKey(rangeStart),
    endDateKey: getDateKey(rangeEnd),
  };
}
