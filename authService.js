const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { UserModel } = require('./cosmos');

async function registerUser(email, password) {
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new Error('Użytkownik już istnieje');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const payload = { email, id: uuidv4() };
  const token = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  await sendEmail(email, token);

  const user = new UserModel({
    email,
    password: hashedPassword,
    token,
    firstLogin: true
  });

  await user.save();

  return token;
}

async function loginUser(email, password, providedToken) {
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new Error('Nieprawidłowy email lub hasło');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Nieprawidłowy email lub hasło');
  }

  if (user.firstLogin) {
    if (!providedToken) {
      throw new Error('Token wymagany przy pierwszym logowaniu');
    }
    if (providedToken !== user.token) {
      throw new Error('Nieprawidłowy token');
    }

    user.firstLogin = false;
    await user.save();
  }

  return user.token;
}

async function sendEmail(to, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmail.user,
      pass: config.gmail.pass,
    },
  });

  await transporter.sendMail({
    from: `"System Rejestracji" <${config.gmail.user}>`,
    to,
    subject: 'Twój token rejestracyjny',
    text: `Witaj!\n\nTwój token JWT (ważny przez 30 dni):\n\n${token}`,
  });
}


module.exports = { registerUser, loginUser };
