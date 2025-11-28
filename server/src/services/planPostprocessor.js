// src/services/planPostprocessor.js

function normalizeDay(day) {
  if (!day) return null;

  const map = {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday"
  };

  const d = day.trim().toLowerCase();

  // Accept full names only (as per Niraj's design)
  if (map[d]) return map[d];

  throw new Error(`Invalid day: ${day}`);
}

function validateTime(time) {
  // Valid time formats: "HH:MM" (24h)
  const regex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!regex.test(time)) {
    throw new Error(`Invalid time format: ${time}`);
  }
}

function validateWeeklyPlan(weekly_plan) {
  if (!Array.isArray(weekly_plan)) {
    throw new Error("weekly_plan must be an array");
  }

  return weekly_plan.map(entry => {
    if (!entry.day || !entry.time || !entry.activity) {
      throw new Error("Each weekly_plan entry must include day, time, activity");
    }

    // Normalize full weekday names
    entry.day = normalizeDay(entry.day);

    validateTime(entry.time);

    return entry;
  });
}

function validateMilestones(milestones) {
  if (!Array.isArray(milestones)) {
    throw new Error("milestones must be an array");
  }

  return milestones.map(m => {
    if (!m.date || !m.goal) {
      throw new Error("Each milestone must include date and goal");
    }

    // Basic ISO date validation
    if (isNaN(Date.parse(m.date))) {
      throw new Error(`Invalid date format: ${m.date}`);
    }

    return m;
  });
}

function postprocessPlanResponse(modelOutput) {
  try {
    const plan = typeof modelOutput === "string"
      ? JSON.parse(modelOutput)
      : modelOutput;

    if (!plan.weekly_plan) throw new Error("Missing weekly_plan");
    if (!plan.milestones) throw new Error("Missing milestones");

    return {
      weekly_plan: validateWeeklyPlan(plan.weekly_plan),
      milestones: validateMilestones(plan.milestones)
    };
  } catch (err) {
    console.error("Postprocessor failed:", err.message);
    throw err;
  }
}

module.exports = {
  postprocessPlanResponse
};
