const mongoose = require('mongoose');

const PASS_GRADE = 5;
const round2 = (n) => Math.round(n * 100) / 100;
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);

const evaluationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  weight: { type: Number, required: true, min: 1, max: 100 }, // % de la nota final
  grade: { type: Number, min: 0, max: 10, default: null }, // null = aún sin nota
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

// ---- Calculadora de notas ----
subjectSchema.methods.summary = function () {
  const ev = this.evaluations;
  const graded = ev.filter((e) => e.grade !== null && e.grade !== undefined);
  const totalWeight = ev.reduce((s, e) => s + e.weight, 0);
  const gradedWeight = graded.reduce((s, e) => s + e.weight, 0);
  const points = graded.reduce((s, e) => s + (e.grade * e.weight) / 100, 0); // aportado a la final
  const remaining = Math.max(100 - gradedWeight, 0); // % todavía sin nota
  const average = gradedWeight > 0 ? points / (gradedWeight / 100) : null; // media de lo evaluado

  let needed = null;
  let state = 'Sin notas';
  if (graded.length > 0 || remaining < 100) {
    if (points >= PASS_GRADE - 1e-9) {
      state = 'Aprobada';
    } else if (remaining <= 0) {
      state = 'Suspensa';
    } else {
      needed = (PASS_GRADE - points) / (remaining / 100);
      state = needed > 10 ? 'Imposible aprobar' : 'En curso';
    }
  }
  return {
    totalWeight: round2(totalWeight),
    gradedWeight: round2(gradedWeight),
    remaining: round2(remaining),
    points: round2(points),
    average: average === null ? null : round2(average),
    needed: needed === null ? null : round2(needed),
    state,
  };
};

subjectSchema.methods.addEvaluation = function ({ name, weight, grade }) {
  const total = this.evaluations.reduce((s, e) => s + e.weight, 0);
  if (total + weight > 100 + 1e-9) {
    const err = new Error(`La suma de pesos superaría el 100% (ya tienes ${total}%)`);
    err.status = 422;
    throw err;
  }
  const g = grade === '' || grade === undefined || grade === null ? null : grade;
  this.evaluations.push({ name, weight, grade: g });
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
