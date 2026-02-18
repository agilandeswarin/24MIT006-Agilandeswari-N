exports.dashboard = (req, res) => {
  res.json({
    message: "Welcome to CropSevai Hub Dashboard",
    user: req.user
  });
};
