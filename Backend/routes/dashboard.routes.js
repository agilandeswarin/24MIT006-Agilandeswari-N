const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { dashboard } = require("../controllers/dashboard.controller");

router.get("/", auth, dashboard);

module.exports = router;
