const router = require("express").Router();
const { login } = require("../controllers/auth.controller");

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  // DEMO LOGIN – allow any credentials
  res.json({
    message: "Login successful",
    token: "demo-token-12345",
    user: {
      name: "Demo User",
      email: email
    }
  });
});


module.exports = router;
if (!user) {
  return res.status(401).json({ message: "Invalid email or password" });
}


