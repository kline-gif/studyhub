const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Subject = require('../models/Subject');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const forbidden = () => httpError(403, 'No tienes permisos para realizar esta acción');
const notFound = () => httpError(404, 'Tarea no encontrada');

async function renderForm(req, res, { status = 200, task, action, isEdit, errors }) {
  const subjects = await Subject.ownedBy(req.user);
  res.status(status).render('tasks/form', {
    title: isEdit ? 'Editar tarea' : 'Nueva tarea',
    task,
    action,
    isEdit,
    subjects,
    types: Task.TYPES,
    priorities: Task.PRIORITIES,
    statuses: Task.STATUSES,
    ...(errors ? { errors } : {}),
  });
}

exports.index = async (req, res, next) => {
  try {
    const { q = '', status = '', subject = '', page, limit } = req.query;
    const [data, subjects] = await Promise.all([
      Task.search({ user: req.user, q, status, subject, page, limit }),
      Subject.ownedBy(req.user),
    ]);
    res.render('tasks/index', { title: 'Tareas', ...data, q, status, subject, subjects, statuses: Task.STATUSES });
  } catch (err) {
    next(err);
  }
};

exports.newForm = async (req, res, next) => {
  try {
    await renderForm(req, res, { task: {}, action: '/tasks', isEdit: false });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return await renderForm(req, res, {
        status: 422, task: req.body, action: '/tasks', isEdit: false, errors: result.array(),
      });
    }
    const task = await Task.createFor(req.user, req.body);
    res.flash('success', 'Tarea creada');
    res.redirect(`/tasks/${task._id}`);
  } catch (err) {
    if (err.status === 422) {
      return renderForm(req, res, {
        status: 422, task: req.body, action: '/tasks', isEdit: false, errors: [{ msg: err.message }],
      }).catch(next);
    }
    next(err);
  }
};

exports.show = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('subject', 'name code').populate('owner', 'name');
    if (!task) throw notFound();
    if (!task.canView(req.user)) throw forbidden();
    res.render('tasks/show', {
      title: task.title,
      task,
      canEdit: task.canEdit(req.user),
      canDelete: task.canDelete(req.user),
    });
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw notFound();
    if (!task.canEdit(req.user)) throw forbidden();
    await renderForm(req, res, { task, action: `/tasks/${task._id}?_method=PUT`, isEdit: true });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw notFound();
    if (!task.canEdit(req.user)) throw forbidden();
    const action = `/tasks/${task._id}?_method=PUT`;

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return await renderForm(req, res, {
        status: 422, task: { _id: task._id, ...req.body }, action, isEdit: true, errors: result.array(),
      });
    }
    try {
      await task.updateFrom(req.user, req.body);
    } catch (err) {
      if (err.status !== 422) throw err;
      return await renderForm(req, res, {
        status: 422, task: { _id: task._id, ...req.body }, action, isEdit: true, errors: [{ msg: err.message }],
      });
    }
    res.flash('success', 'Tarea actualizada');
    res.redirect(`/tasks/${task._id}`);
  } catch (err) {
    next(err);
  }
};

// Cambio rápido de estado (ej. "Marcar como completada")
exports.setStatus = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw notFound();
    if (!task.canEdit(req.user)) throw forbidden();
    if (!Task.STATUSES.includes(req.body.status)) throw httpError(422, 'Estado inválido');
    task.status = req.body.status;
    await task.save();
    res.flash('success', `Tarea marcada como "${task.status}"`);
    res.redirect(req.get('referer') || '/tasks');
  } catch (err) {
    next(err);
  }
};

exports.destroy = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw notFound();
    if (!task.canDelete(req.user)) throw forbidden();
    await task.deleteOne();
    res.flash('success', 'Tarea eliminada');
    res.redirect('/tasks');
  } catch (err) {
    next(err);
  }
};
