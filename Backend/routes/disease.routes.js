const router = require("express").Router();
const { getDiseasesByCrop } = require("../controllers/disease.controller");

router.get("/:cropId", getDiseasesByCrop);

module.exports = router;
