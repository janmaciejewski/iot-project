const mongoose = require('mongoose');
const config = require('./config');

const statusSchema = new mongoose.Schema({
  value: { type: Number, required: true }
});
const StatusModel = mongoose.models.Status || mongoose.model('Status', statusSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  token: String,
  firstLogin: { type: Boolean, default: true }  
});

const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

async function connectToCosmosDb() {
  try {
    await mongoose.connect(config.cosmosDb.connectionString);
    console.log('Połączono z Cosmos DB!');
  } catch (error) {
    console.error('Błąd połączenia z Cosmos DB:', error);
  }
}

async function getStatus() {
  let status = await StatusModel.findOne();
  if (!status) {
    status = new StatusModel({ value: 0 });
    await status.save();
  }
  return status;
}

async function updateStatus(value) {
  let status = await StatusModel.findOne();
  if (status) {
    status.value = value;
    await status.save();
  } else {
    const newStatus = new StatusModel({ value });
    await newStatus.save();
  }
}

module.exports = {
  connectToCosmosDb,
  getStatus,
  updateStatus,
  UserModel
};
