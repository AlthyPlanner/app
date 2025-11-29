function normalizeDay(day) {
  // Make validation more forgiving
  const cleaned = day.trim().toLowerCase().replace(/[^a-z]/g, "");

  const map = {
    monday: 0,
    mon: 0,
    tuesday: 1,
    tue: 1,
    wednesday: 2,
    wed: 2,
    thursday: 3,
    thu: 3,
    friday: 4,
    fri: 4,
    saturday: 5,
    sat: 5,
    sunday: 6,
    sun: 6
  };

  if (!(cleaned in map)) {
    throw new Error("Invalid day: " + day);
  }

  return map[cleaned];
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
    activity: item.activity.trim(),
  }));

  const milestones = data.milestones.map((ms) => ({
    date: normalizeDate(ms.date),
    goal: ms.goal.trim(),
  }));

  return { weekly_plan: weekly, milestones };
}

module.exports = { postprocessPlan };
