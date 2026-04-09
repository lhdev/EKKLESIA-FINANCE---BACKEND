const { Router } = require("express");
const authMiddleware = require("../middlewares/auth.middleware");

const router = Router();

router.get("/me", authMiddleware, (req, res) => {
  return res.json({
    message: "Rota protegida OK",
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

module.exports = router;
