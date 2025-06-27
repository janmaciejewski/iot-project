const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

async function registerUser(email, password, usersContainer) {
  const { resources: existingUsers } = await usersContainer.items.query({ query: 'SELECT * FROM c WHERE c.email = @email', parameters: [{ name: '@email', value: email }] }).fetchAll();
  
  if (existingUsers.length > 0) {
    throw new Error('Użytkownik już istnieje');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

  const user = { id: uuidv4(), email, password: hashedPassword, token };

  await usersContainer.items.create(user);
  await sendEmail(email, token);

  return token;
}

async function loginUser(email, password, usersContainer) {
  const { resources: users } = await usersContainer.items.query({ query: 'SELECT * FROM c WHERE c.email = @email', parameters: [{ name: '@email', value: email }] }).fetchAll();
  if (users.length === 0) {
    throw new Error('Nieprawidłowy email lub hasło');
  }

  const user = users[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Nieprawidłowy email lub hasło');

  return user.token;
}

async function sendEmail(to, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmail.user,
      pass: config.gmail.pass
    }
  });

  await transporter.sendMail({
    from: `"System Rejestracji" <${config.gmail.user}>`,
    to,
    subject: 'Twój token rejestracyjny',
    text: `Witaj! Twój token JWT ważny przez 30 dni:\n\n${token}`
  });
}

module.exports = { registerUser, loginUser };
