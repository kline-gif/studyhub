const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Hash del password antes de guardar
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// Lógica de negocio: registro y login viven en el modelo
userSchema.statics.register = async function ({ name, email, password }) {
  // El rol siempre es "user": un admin se crea con scripts/createAdmin.js
  return this.create({ name, email, password, role: 'user' });
};

userSchema.statics.authenticate = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');
  if (!user) return null;
  const ok = await user.comparePassword(password);
  return ok ? user : null;
};

module.exports = mongoose.model('User', userSchema);
