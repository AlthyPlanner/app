const express = require("express");
const router = express.Router();

const { postprocessPlan } = require("../services/planPostprocessor");

// TEMPORARY LLM function for testing
async function callLLM(goal) {
  return JSON.stringify({
    weekly_plan: [
      { day: "Monday", time: "7am", activity: "Run 5 km" }
    ],
    milestones: [
      { date: "2026-03-01", goal: "Run a 10k" }
    ]
  });
}

router.post("/", async (req, res) => {
  try {
    const userGoal = req.body.goal;

    const rawOutput = await callLLM(userGoal);

    const cleanPlan = postprocessPlan(rawOutput);

    res.json({ success: true, cleanPlan });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
