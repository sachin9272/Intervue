import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  correct: { type: Boolean, default: false },
  votes: { type: Number, default: 0 } 
});

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [optionSchema],  // Array of objects
  timer: { type: String, required: true },
  teacherUserName: String
});

const Poll = mongoose.model("Poll", pollSchema);
export default Poll