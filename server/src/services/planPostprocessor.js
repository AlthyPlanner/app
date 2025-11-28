function normalizeDay(day) {
  const days = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  const key = day.trim().toLowerCase();
  if (!days[key]) throw new Error("Invalid day: " + day);
  return days[key];
}

function normalizeTime(time) {
  let t = time.toLowerCase().replace(/\s+/g, "");

  if (t.includes("am") || t.includes("pm")) {
    const dt = new Date("1970-01-01 " + time);
    return dt.toISOString().substr(11, 5);
  }

  if (/^\d{2}:\d{2}$/.test(t)) return t;

  throw new Error("Invalid time: " + time);
}

function normalizeDate(dateString) {
  if (isNaN(Date.parse(dateString))) {
    throw new Error("Invalid date: " + dateString);
  }
  return dateString;
}

function postprocessPlan(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error("Model returned invalid JSON");
  }

  if (!data.weekly_plan || !data.milestones) {
    throw new Error("Missing weekly_plan or milestones");
  }

  const weekly = data.weekly_plan.map((item) => ({
    weekdayIndex: normalizeDay(item.day),
    time: normalizeTime(item.time),
    activity: item.activity.trim()
  }));

  const milestones = data.milestones.map((ms) => ({
    date: normalizeDate(ms.date),
    goal: ms.goal.trim()
  }));

  return { weekly_plan: weekly, milestones };
}

module.exports = { postprocessPlan };
