const router = require("express").Router();
const { getCrops } = require("../controllers/crops.controller");

router.get("/", getCrops);

module.exports = router;
