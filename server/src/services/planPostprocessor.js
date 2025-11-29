// src/services/planPostprocessor.js

function normalizeDay(day) {
  // Clean: remove spaces, punctuation, uppercase → lowercase letters only
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
    sun: 6,
  };

  if (!(cleaned in map)) {
    throw new Error("Invalid day: " + day);
  }

  return map[cleaned];
}

function normalizeTime(time) {
  const cleaned = time.toLowerCase().trim().replace(/\s+/g, "");

  // Handle 7am, 8pm, 6:30am, etc.
  if (cleaned.includes("am") || cleaned.includes("pm")) {
    const dt = new Date("1970-01-01 " + time);
    return dt.toISOString().substring(11, 16); // HH:MM
  }

  // Handle "07:30"
  if (/^\d{2}:\d{2}$/.test(cleaned)) return cleaned;

  throw new Error("Invalid time: " + time);
}

function normalizeDate(dateString) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date: " + dateString);
  }
  return d.toISOString();
}

function postprocessPlan(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
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

