// src/services/planPostprocessor.js

// Normalize weekday string → weekdayIndex
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

  // FIX: correct validation logic
  if (!(key in days)) {
    throw new Error("Invalid day: " + day);
  }

  return days[key];
}

// Normalize time → "HH:MM"
function normalizeTime(time) {
  let t = time.toLowerCase().replace(/\s+/g, "");

  // Handle AM/PM
  if (t.includes("am") || t.includes("pm")) {
    const parsed = new Date("1970-01-01 " + time);
    return parsed.toISOString().substr(11, 5); // → "HH:MM"
  }

  // Handle 24-hour "HH:MM"
  if (/^\d{2}:\d{2}$/.test(t)) {
    return t;
  }

  throw new Error("Invalid time: " + time);
}

// Normalize milestone date → ISO 8601
function normalizeDate(dateString) {
  const d = new Date(dateString);

  if (isNaN(d.getTime())) {
    throw new Error("Invalid date: " + dateString);
  }

  // Convert to ISO 8601 (required by rest of codebase)
  return d.toISOString();
}

// Core postprocessor
function postprocessPlan(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    throw new Error("Model returned invalid JSON");
  }

  // Validate presence
  if (!data.weekly_plan || !data.milestones) {
    throw new Error("Missing weekly_plan or milestones");
  }

  // Process weekly plan
  const weekly = data.weekly_plan.map((item) => ({
    weekdayIndex: normalizeDay(item.day),   // Mon → 0
    time: normalizeTime(item.time),         // "07:00"
    activity: item.activity.trim(),
  }));

  // Process milestones
  const milestones = data.milestones.map((ms) => ({
    date: normalizeDate(ms.date),  // → ISO 8601 string
    goal: ms.goal.trim(),
  }));

  return {
    weekly_plan: weekly,
    milestones,
  };
}

module.exports = { postprocessPlan };
