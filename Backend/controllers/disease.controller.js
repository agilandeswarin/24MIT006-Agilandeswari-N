const db = require("../config/db");

exports.getDiseasesByCrop = (req, res) => {
  db.query(
    "SELECT * FROM diseases WHERE crop_id = ?",
    [req.params.cropId],
    (err, results) => res.json(results)
  );
};
