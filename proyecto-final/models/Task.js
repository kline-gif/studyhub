const mongoose = require('mongoose');
const Subject = require('./Subject');

const TYPES = ['Práctica', 'Examen', 'Proyecto', 'Lectura', 'Otro'];
const PRIORITIES = ['Baja', 'Media', 'Alta'];
const STATUSES = ['Pendiente', 'En progreso', 'Completada'];
const DAY = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    type: { type: String, enum: TYPES, default: 'Práctica' },
    priority: { type: String, enum: PRIORITIES, default: 'Media' },
    status: { type: String, enum: STATUSES, default: 'Pendiente' },
    dueDate: { type: Date, required: true },
  },
  { timestamps: true }
);

taskSchema.virtual('daysLeft').get(function () {
  return Math.round((this.dueDate - startOfToday()) / DAY);
});
taskSchema.virtual('isOverdue').get(function () {
  return this.status !== 'Completada' && this.daysLeft < 0;
});

// ---- Permisos ----
taskSchema.methods.isOwnedBy = function (user) {
  return !!user && sameId(this.owner, user._id);
};
taskSchema.methods.canView = function (user) {
  return !!user && (user.role === 'admin' || this.isOwnedBy(user));
};
taskSchema.methods.canEdit = function (user) {
  return this.isOwnedBy(user);
};
taskSchema.methods.canDelete = function (user) {
  return !!user && (user.role === 'admin' || this.isOwnedBy(user));
};

// La asignatura elegida debe pertenecer al usuario
taskSchema.statics.assertSubjectOwned = async function (user, subjectId) {
  const subject = await Subject.findById(subjectId);
  if (!subject || !subject.isOwnedBy(user)) {
    const err = new Error('Asignatura no válida');
    err.status = 422;
    throw err;
  }
  return subject;
};

taskSchema.statics.createFor = async function (user, data) {
  await this.assertSubjectOwned(user, data.subject);
  const { subject, title, description, type, priority, status, dueDate } = data;
  return this.create({ owner: user._id, subject, title, description, type, priority, status, dueDate });
};

taskSchema.methods.updateFrom = async function (user, data) {
  await this.constructor.assertSubjectOwned(user, data.subject);
  const { subject, title, description, type, priority, status, dueDate } = data;
  Object.assign(this, { subject, title, description, type, priority, status, dueDate });
  return this.save();
};

taskSchema.statics.search = async function ({ user, q, status, subject, page = 1, limit = 10 }) {
  const filter = {};
  if (user.role !== 'admin') filter.owner = user._id;
  if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (STATUSES.includes(status)) filter.status = status;
  if (subject && mongoose.isValidObjectId(subject)) filter.subject = subject;

  page = Math.max(parseInt(page, 10) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const [items, total] = await Promise.all([
    this.find(filter)
      .populate('subject', 'name code')
      .populate('owner', 'name')
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    this.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
};

taskSchema.statics.dashboard = async function (user) {
  const mine = { owner: user._id };
  const open = { ...mine, status: { $ne: 'Completada' } };
  const today = startOfToday();
  const week = new Date(today.getTime() + 7 * DAY);
  const [pending, completed, overdueCount, overdue, upcoming] = await Promise.all([
    this.countDocuments(open),
    this.countDocuments({ ...mine, status: 'Completada' }),
    this.countDocuments({ ...open, dueDate: { $lt: today } }),
    this.find({ ...open, dueDate: { $lt: today } }).populate('subject', 'name code').sort({ dueDate: 1 }).limit(5),
    this.find({ ...open, dueDate: { $gte: today, $lte: week } }).populate('subject', 'name code').sort({ dueDate: 1 }).limit(8),
  ]);
  return { pending, completed, overdueCount, overdue, upcoming };
};

const Task = mongoose.model('Task', taskSchema);
Object.assign(Task, { TYPES, PRIORITIES, STATUSES });
module.exports = Task;
