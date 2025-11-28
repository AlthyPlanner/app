const express = require("express");
const router = express.Router();

const { postprocessPlan } = require("../services/planPostprocessor");

// Example: POST /api/plan
router.post("/", async (req, res) => {
  try {
    const userInput = req.body.goal;

    // TODO: Replace with your LLM call
    const rawModelOutput = await callLLM(userInput);

    const cleanPlan = postprocessPlan(rawModelOutput);

    return res.json({
      success: true,
      plan: cleanPlan
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// fake model call for now
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

module.exports = router;
