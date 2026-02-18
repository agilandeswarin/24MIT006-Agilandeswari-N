const db = require("../config/db");

exports.getCrops = (req, res) => {
  db.query("SELECT * FROM crops", (err, results) => {
    res.json(results);
  });
};
