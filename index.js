require('dotenv').config();
const mongoose = require('mongoose');

const CONFIG = {
  DB: process.env.MONGO_URL,
};

const db = mongoose.createConnection(CONFIG.DB, {
  keepAlive: true,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 0,
  useNewUrlParser: true,
});

db.on('connected', () => {
  console.log('MongoDB connected successfully');
});

db.on('error', (error) => {
  console.error(error);
});

const userSchema = new mongoose.Schema({ count: { type: Number, required: true, default: 0 } });

const conn = {
  db,
  models: { User: db.model('user', userSchema) },
};

module.exports = { conn };
