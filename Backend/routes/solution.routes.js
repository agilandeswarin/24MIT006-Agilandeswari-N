const router = require("express").Router();
const { getSolutionsByDisease } = require("../controllers/solution.controller");

router.get("/:diseaseId", getSolutionsByDisease);

module.exports = router;
