const db = require("../config/db");

exports.getSolutionsByDisease = (req, res) => {
  db.query(
    "SELECT * FROM solutions WHERE disease_id = ?",
    [req.params.diseaseId],
    (err, results) => res.json(results)
  );
};
