const mongoose = require('mongoose');

const MIN_GRADE = 2;
const MAX_GRADE = 5;
const PASS_GRADE = 3;
const round2 = (n) => Math.round(n * 100) / 100;
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);

const evaluationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  grade: { type: Number, min: MIN_GRADE, max: MAX_GRADE, default: null }, // null = pendiente
});

const subjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, trim: true, maxlength: 20, default: '' },
    credits: { type: Number, min: 1, max: 30, default: 6 },
    semester: { type: String, trim: true, maxlength: 20, default: '' },
    evaluations: [evaluationSchema],
  },
  { timestamps: true }
);

// ---- Permisos ----
subjectSchema.methods.isOwnedBy = function (user) {
  return !!user && sameId(this.owner, user._id);
};
subjectSchema.methods.canView = function (user) {
  return !!user && (user.role === 'admin' || this.isOwnedBy(user));
};
subjectSchema.methods.canEdit = function (user) {
  return this.isOwnedBy(user);
};
subjectSchema.methods.canDelete = function (user) {
  return !!user && (user.role === 'admin' || this.isOwnedBy(user));
};

// ---- Calculadora de notas (escala 2-5, aprobado desde 3, sin pesos) ----
subjectSchema.methods.summary = function () {
  const ev = this.evaluations;
  const graded = ev.filter((e) => e.grade !== null && e.grade !== undefined);
  const pending = ev.length - graded.length;
  const sum = graded.reduce((s, e) => s + e.grade, 0);
  const average = graded.length ? sum / graded.length : null;

  let needed = null;
  let state = 'Sin notas';
  if (graded.length > 0) {
    if (pending === 0) {
      state = average >= PASS_GRADE - 1e-9 ? 'Aprobada' : 'Suspensa';
    } else {
      // nota media que necesitas en las pendientes para que la media final sea 3
      const n = (PASS_GRADE * ev.length - sum) / pending;
      if (n <= MIN_GRADE) {
        state = 'Aprobada'; // aunque saques el mínimo en lo que falta, apruebas
      } else if (n > MAX_GRADE) {
        state = 'Imposible aprobar';
        needed = round2(n);
      } else {
        state = 'En curso';
        needed = round2(n);
      }
    }
  }
  return {
    total: ev.length,
    gradedCount: graded.length,
    pending,
    average: average === null ? null : round2(average),
    needed,
    state,
  };
};

subjectSchema.methods.addEvaluation = function ({ name, grade }) {
  const g = grade === '' || grade === undefined || grade === null ? null : grade;
  this.evaluations.push({ name, grade: g });
  return this.save();
};

subjectSchema.methods.removeEvaluation = function (evalId) {
  this.evaluations.pull(evalId);
  return this.save();
};

// ---- Consultas ----
subjectSchema.statics.ownedBy = function (user) {
  return this.find({ owner: user._id }).sort({ name: 1 });
};

subjectSchema.statics.search = async function ({ user, q, page = 1, limit = 12 }) {
  const filter = {};
  if (user.role !== 'admin') filter.owner = user._id;
  if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  page = Math.max(parseInt(page, 10) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
  const [items, total] = await Promise.all([
    this.find(filter).populate('owner', 'name').sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    this.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.max(Math.ceil(total / limit), 1) };
};

// Promedio ponderado por créditos (solo asignaturas con alguna nota)
subjectSchema.statics.overview = async function (user) {
  const subjects = await this.ownedBy(user);
  const rows = subjects.map((s) => ({ subject: s, summary: s.summary() }));
  const withAvg = rows.filter((r) => r.summary.average !== null);
  const credits = withAvg.reduce((s, r) => s + r.subject.credits, 0);
  const gpa = credits
    ? round2(withAvg.reduce((s, r) => s + r.summary.average * r.subject.credits, 0) / credits)
    : null;
  return { rows, gpa };
};

// Al borrar una asignatura se borran también sus tareas
subjectSchema.statics.removeCascade = async function (subject) {
  await mongoose.model('Task').deleteMany({ subject: subject._id });
  await subject.deleteOne();
};

module.exports = mongoose.model('Subject', subjectSchema);
