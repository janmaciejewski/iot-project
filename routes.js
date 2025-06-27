const express = require("express");
const router = express.Router();
const { registerUser } = require("./authService");
const { UserModel } = require("./cosmos");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("./config");
const { getStatus, updateStatus } = require("./cosmos");
const { sendStatusToIoTHub } = require("./iot-hub"); // <--- Nowe

let interval = null;
let direction = "stopped";

// Rejestracja
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await registerUser(email, password);
    res.json({
      success: true,
      message: "Zarejestrowano. Sprawdź email z tokenem.",
      token,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Logowanie
router.post("/login", async (req, res) => {
  const { email, password, token: providedToken } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Nieprawidłowy email lub hasło" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Nieprawidłowy email lub hasło" });
    }

    if (user.firstLogin) {
      if (!providedToken) {
        return res.status(403).json({ success: false, message: "Token wymagany przy pierwszym logowaniu" });
      }
      if (providedToken !== user.token) {
        return res.status(403).json({ success: false, message: "Nieprawidłowy token" });
      }

      user.firstLogin = false;
      await user.save();
    }

    res.json({ success: true, token: user.token });
  } catch (err) {
    console.error("Błąd logowania:", err);
    res.status(500).json({ success: false, message: "Błąd logowania" });
  }
});

// Middleware autoryzacji
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
}

// Wylogowanie
router.post("/logout", (req, res) => {
  req.session?.destroy?.();
  res.json({ success: true });
});

router.use(requireAuth);

function startInterval() {
  if (interval) return;

  interval = setInterval(async () => {
    try {
      const status = await getStatus();
      if (!status || typeof status.value !== "number") {
        stopInterval();
        return;
      }

      let newValue = status.value;

      if (direction === "up" && status.value < 100) {
        newValue = Math.min(status.value + 5, 100);
        await updateStatus(newValue);
        sendStatusToIoTHub(newValue, "up");
        if (newValue >= 100) stopInterval();
      } else if (direction === "down" && status.value > 0) {
        newValue = Math.max(status.value - 5, 0);
        await updateStatus(newValue);
        sendStatusToIoTHub(newValue, "down");
        if (newValue <= 0) stopInterval();
      } else {
        stopInterval();
      }
    } catch (err) {
      console.error("Błąd w interwale:", err);
      stopInterval();
    }
  }, 1000);
}

function stopInterval() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  direction = "stopped";
  sendStatusToIoTHub(null, "stop");
}

router.get("/status", async (req, res) => {
  try {
    let status = await getStatus();
    if (!status || typeof status.value !== "number") {
      await updateStatus(0);
      status = await getStatus();
    }
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: "Błąd pobierania statusu" });
  }
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
  try {
    stopInterval();
    let status = await getStatus();
    if (!status || typeof status.value !== "number") {
      await updateStatus(0);
      status = await getStatus();
    }
    await updateStatus(status.value);
    sendStatusToIoTHub(status.value, "stop");
    res.json({ message: "Zatrzymano", value: status.value });
  } catch (err) {
    res.status(500).json({ error: "Błąd zatrzymywania" });
  }
});

module.exports = router;
