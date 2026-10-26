const { validationResult } = require('express-validator');
const Subject = require('../models/Subject');
const Task = require('../models/Task');

const httpError = (status, message) => Object.assign(new Error(message), { status });
const forbidden = () => httpError(403, 'No tienes permisos para realizar esta acción');
const notFound = () => httpError(404, 'Asignatura no encontrada');

exports.index = async (req, res, next) => {
  try {
    const { q = '', page, limit } = req.query;
    const data = await Subject.search({ user: req.user, q, page, limit });
    res.render('subjects/index', { title: 'Asignaturas', ...data, q });
  } catch (err) {
    next(err);
  }
};

exports.newForm = (req, res) =>
  res.render('subjects/form', { title: 'Nueva asignatura', subject: {}, action: '/subjects', isEdit: false });

exports.create = async (req, res, next) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).render('subjects/form', {
        title: 'Nueva asignatura', subject: req.body, action: '/subjects', isEdit: false, errors: result.array(),
      });
    }
    const { name, code, semester } = req.body;
    const subject = await Subject.create({ owner: req.user._id, name, code, semester });
    res.flash('success', 'Asignatura creada');
    res.redirect(`/subjects/${subject._id}`);
  } catch (err) {
    next(err);
  }
};

exports.show = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('owner', 'name');
    if (!subject) throw notFound();
    if (!subject.canView(req.user)) throw forbidden();
    const tasks = await Task.find({ subject: subject._id }).sort({ dueDate: 1 });
    res.render('subjects/show', {
      title: subject.name,
      subject,
      tasks,
      summary: subject.summary(),
      canEdit: subject.canEdit(req.user),
      canDelete: subject.canDelete(req.user),
    });
  } catch (err) {
    next(err);
  }
};

exports.editForm = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw notFound();
    if (!subject.canEdit(req.user)) throw forbidden();
    res.render('subjects/form', {
      title: 'Editar asignatura', subject, action: `/subjects/${subject._id}?_method=PUT`, isEdit: true,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw notFound();
    if (!subject.canEdit(req.user)) throw forbidden();

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(422).render('subjects/form', {
        title: 'Editar asignatura',
        subject: { _id: subject._id, ...req.body },
        action: `/subjects/${subject._id}?_method=PUT`,
        isEdit: true,
        errors: result.array(),
      });
    }
    const { name, code, semester } = req.body;
    Object.assign(subject, { name, code, semester });
    await subject.save();
    res.flash('success', 'Asignatura actualizada');
    res.redirect(`/subjects/${subject._id}`);
  } catch (err) {
    next(err);
  }
};

exports.destroy = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw notFound();
    if (!subject.canDelete(req.user)) throw forbidden();
    await Subject.removeCascade(subject);
    res.flash('success', 'Asignatura y sus tareas eliminadas');
    res.redirect('/subjects');
  } catch (err) {
    next(err);
  }
};

// ---- Evaluaciones (parciales, prueba final, coloquio, extraordinario, mundial) ----
exports.addEvaluation = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw notFound();
    if (!subject.canEdit(req.user)) throw forbidden();

    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.flash('error', result.array()[0].msg);
      return res.redirect(`/subjects/${subject._id}`);
    }
    try {
      await subject.addEvaluation(req.body);
      res.flash('success', 'Evaluación añadida');
    } catch (err) {
      if (err.status !== 422) throw err;
      res.flash('error', err.message);
    }
    res.redirect(`/subjects/${subject._id}`);
  } catch (err) {
    next(err);
  }
};

exports.removeEvaluation = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) throw notFound();
    if (!subject.canEdit(req.user)) throw forbidden();
    await subject.removeEvaluation(req.params.evalId);
    res.flash('success', 'Evaluación eliminada');
    res.redirect(`/subjects/${subject._id}`);
  } catch (err) {
    next(err);
  }
};
