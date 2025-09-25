export const teacherLogin = async(req, res) => {
    console.log("Hitted")
  const username = `teacher_${Date.now()}`;
  res.json({ username });
};