const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: String,
  email: { type: String, required: true, unique: true },
  password: String,
  token: String
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);