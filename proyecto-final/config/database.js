const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error('Falta la variable de entorno DATABASE_URL');
  }
  await mongoose.connect(uri);
  console.log('✅ Conectado a MongoDB');
}

module.exports = connectDB;
