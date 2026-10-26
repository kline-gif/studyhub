const mongoose = require('mongoose');

const MIN_GRADE = 2;
const MAX_GRADE = 5;
const PASS_GRADE = 3;
const MUNDIAL_MAX = 3; // el mundial se evalúa sobre 3 puntos
const TYPES = ['parcial', 'final', 'coloquio', 'extraordinario', 'mundial'];
const ORDINARY_TYPES = ['parcial', 'final', 'coloquio']; // estas cuentan para la media
const round2 = (n) => Math.round(n * 100) / 100;
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);
const hasGrade = (e) => e.grade !== null && e.grade !== undefined;
const typeOf = (e) => e.type || 'parcial'; // las evaluaciones viejas se tratan como parcial
const unprocessable = (message) => Object.assign(new Error(message), { status: 422 });

const evaluationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: TYPES, default: 'parcial' },
  grade: { type: Number, min: MIN_GRADE, max: MAX_GRADE, default: null }, // null = pendiente
});

const subjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, trim: true, maxlength: 20, default: '' },
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
// Flujo: ordinaria (parciales + final, el coloquio suma a la media)
//        -> extraordinario (con 3 aprueba) -> mundial (sobre 3, con 3 aprueba)
subjectSchema.methods.summary = function () {
  const ev = this.evaluations;
  const ord = ev.filter((e) => ORDINARY_TYPES.includes(typeOf(e)));
  const graded = ord.filter(hasGrade);
  const pending = ord.length - graded.length;
  const sum = graded.reduce((s, e) => s + e.grade, 0);
  const average = graded.length ? sum / graded.length : null;

  const finalFailed = ord.some((e) => typeOf(e) === 'final' && hasGrade(e) && e.grade < PASS_GRADE);
  const finalPending = ord.some((e) => typeOf(e) === 'final' && !hasGrade(e));
  const hasColoquio = ord.some((e) => typeOf(e) === 'coloquio' && hasGrade(e));
  const extra = ev.filter((e) => typeOf(e) === 'extraordinario' && hasGrade(e)).pop();
  const mundial = ev.filter((e) => typeOf(e) === 'mundial' && hasGrade(e)).pop();

  let needed = null;
  let state = 'Sin notas';

  if (mundial) {
    state = mundial.grade >= PASS_GRADE ? 'Aprobada' : 'Desaprobada';
  } else if (extra) {
    state = extra.grade >= PASS_GRADE ? 'Aprobada' : 'A mundial';
  } else if (graded.length > 0) {
    if (finalFailed) {
      // suspender la final = no apruebas en la ordinaria
      state = 'A extraordinario';
    } else if (pending === 0) {
      if (average >= PASS_GRADE - 1e-9) state = 'Aprobada';
      else state = hasColoquio ? 'A extraordinario' : 'A coloquio';
    } else {
      // nota media que necesitas en las pendientes para que la media final sea 3
      const n = (PASS_GRADE * ord.length - sum) / pending;
      if (finalPending) {
        // la final hay que aprobarla sí o sí, así que como mínimo un 3
        needed = round2(Math.max(n, PASS_GRADE));
        state = needed > MAX_GRADE ? 'Imposible aprobar' : 'En curso';
      } else if (n <= MIN_GRADE) {
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
    total: ord.length,
    gradedCount: graded.length,
    pending,
    average: average === null ? null : round2(average),
    needed,
    state,
  };
};

subjectSchema.methods.addEvaluation = function ({ name, type, grade }) {
  const t = TYPES.includes(type) ? type : 'parcial';
  const g = grade === '' || grade === undefined || grade === null ? null : Number(grade);
  if (t === 'mundial' && g !== null && g > MUNDIAL_MAX) {
    throw unprocessable('El mundial se evalúa sobre 3 puntos: la nota no puede ser mayor que 3');
  }
  this.evaluations.push({ name, type: t, grade: g });
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

// Promedio simple (solo asignaturas con alguna nota) y asignaturas desaprobadas
subjectSchema.statics.overview = async function (user) {
  const subjects = await this.ownedBy(user);
  const rows = subjects.map((s) => ({ subject: s, summary: s.summary() }));
  const withAvg = rows.filter((r) => r.summary.average !== null);
  const gpa = withAvg.length
    ? round2(withAvg.reduce((s, r) => s + r.summary.average, 0) / withAvg.length)
    : null;
  const failedCount = rows.filter((r) => r.summary.state === 'Desaprobada').length;
  return { rows, gpa, failedCount };
};

// Al borrar una asignatura se borran también sus tareas
subjectSchema.statics.removeCascade = async function (subject) {
  await mongoose.model('Task').deleteMany({ subject: subject._id });
  await subject.deleteOne();
};

module.exports = mongoose.model('Subject', subjectSchema);
