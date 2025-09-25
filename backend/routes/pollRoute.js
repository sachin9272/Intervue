import express from "express";
import Poll from "../models/pollSchema.js";

const router = express.Router();

// GET /polls/:username -> get all polls created by this user
router.get("/:username", async (req, res, next) => {
  try {
    const { username } = req.params;
    const polls = await Poll.find({ createdBy: username }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) {
    next(err);
  }
});

// POST /polls -> create a new poll
router.post("/", async (req, res, next) => {
  try {
    const { question, options, createdBy } = req.body;

    const poll = new Poll({
      question,
      options: options.map((o) => ({ text: o })),
      createdBy,
      votes: {},
    });

    const savedPoll = await poll.save();
    res.json(savedPoll);
  } catch (err) {
    next(err);
  }
});



// GET poll history of a user
router.get("/polls/:username", async (req, res) => {
  try {
    const { username } = req.params;
    console.log("Username---->", username);
    // find all polls where this user participated or created
    const polls = await Poll.find({
      $or: [
        { teacherUserName: username },
        // { participants: { $in: [username] } }
      ]
    }).sort({ createdAt: -1 });
    console.log("Polls-----------.=>", polls);
    res.status(200).json(polls);
  } catch (error) {
    console.error("Error fetching poll history:", error);
    res.status(500).json({ error: "Failed to fetch poll history" });
  }
});



export default router;
