const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("./authService");
const { getStatus, updateStatus } = require("./cosmos");
const jwt = require('jsonwebtoken');
const config = require("./config");

let interval = null;
let direction = "stopped";

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await registerUser(email, password);
    res.json({ success: true, message: "Zarejestrowano. Sprawdź email z tokenem.", token });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await loginUser(email, password);
    res.json({ success: true, token });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

// Middleware autoryzacji
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Chronione trasy
router.use(requireAuth);

function startInterval() {
  if (interval) return;

  interval = setInterval(async () => {
    let status = await getStatus();

    if (direction === "up") {
      if (status.value < 100) {
        await updateStatus(Math.min(status.value + 5, 100));
      } else {
        stopInterval();
      }
    } else if (direction === "down") {
      if (status.value > 0) {
        await updateStatus(Math.max(status.value - 5, 0));
      } else {
        stopInterval();
      }
    }
  }, 1000);
}

function stopInterval() {
  clearInterval(interval);
  interval = null;
  direction = "stopped";
}

router.get("/status", async (req, res) => {
  const status = await getStatus();
  res.json(status);
});

router.post("/up", (req, res) => {
  direction = "up";
  startInterval();
  res.json({ message: "Podnoszenie rozpoczęte" });
});

router.post("/down", (req, res) => {
  direction = "down";
  startInterval();
  res.json({ message: "Opuszczanie rozpoczęte" });
});

router.post("/stop", async (req, res) => {
  stopInterval();
  const status = await getStatus();
  await updateStatus(status.value);
  res.json({ message: "Zatrzymano", value: status.value });
});

module.exports = router;
