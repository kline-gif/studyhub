// Uso: npm run create-admin -- admin@correo.com MiPassword123 "Nombre Admin"
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const [email, password, name = 'Administrador'] = process.argv.slice(2);
  if (!email || !password) {
    console.log('Uso: npm run create-admin -- <email> <password> [nombre]');
    process.exit(1);
  }
  await mongoose.connect(process.env.DATABASE_URL);
  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    await user.save();
    console.log(`✅ ${email} ahora es admin`);
  } else {
    user = await User.create({ name, email, password, role: 'admin' });
    console.log(`✅ Admin creado: ${user.email}`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
