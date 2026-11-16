const User = require('../models/User');
const Subject = require('../models/Subject');
const Task = require('../models/Task');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const sameId = (a, b) => String(a && a._id ? a._id : a) === String(b && b._id ? b._id : b);

// El admin ve TODO, sin filtrar por usuario
exports.index = async (req, res, next) => {
  try {
    const [users, subjects, tasks] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      Subject.find().populate('owner', 'name email').sort({ name: 1 }),
      Task.find().populate('owner', 'name').populate('subject', 'name').sort({ dueDate: 1 }),
    ]);
    res.render('admin/index', { title: 'Administración', users, subjects, tasks });
  } catch (err) {
    next(err);
  }
};

exports.destroyTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw httpError(404, 'Tarea no encontrada');
    await task.deleteOne();
    res.flash('success', 'Tarea eliminada');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
};

exports.destroySubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw httpError(404, 'Asignatura no encontrada');
    await Subject.removeCascade(subject); // borra también sus tareas
    res.flash('success', 'Asignatura y sus tareas eliminadas');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
};

exports.destroyUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, 'Usuario no encontrado');
    if (sameId(user, req.user)) {
      res.flash('error', 'No puedes eliminar tu propia cuenta');
      return res.redirect('/admin');
    }
    // Se borran también sus tareas y asignaturas para no dejar datos huérfanos
    await Task.deleteMany({ owner: user._id });
    await Subject.deleteMany({ owner: user._id });
    await user.deleteOne();
    res.flash('success', 'Usuario eliminado junto con sus asignaturas y tareas');
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
};
