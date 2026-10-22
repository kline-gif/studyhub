const { body } = require('express-validator');
const Task = require('../models/Task');

const registerRules = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 60 }),
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('password2')
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Las contraseñas no coinciden'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Email inválido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
];

const taskRules = [
  body('title').trim().notEmpty().withMessage('El título es obligatorio').isLength({ max: 120 }),
  body('description').trim().isLength({ max: 2000 }).withMessage('Descripción demasiado larga'),
  body('subject').isMongoId().withMessage('Elige una asignatura'),
  body('type').isIn(Task.TYPES).withMessage('Tipo inválido'),
  body('priority').isIn(Task.PRIORITIES).withMessage('Prioridad inválida'),
  body('status').isIn(Task.STATUSES).withMessage('Estado inválido'),
  body('dueDate').isISO8601().withMessage('Fecha de entrega inválida'),
];

const subjectRules = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio').isLength({ max: 80 }),
  body('code').trim().isLength({ max: 20 }).withMessage('Código demasiado largo'),
  body('credits').isInt({ min: 1, max: 30 }).withMessage('Los créditos deben estar entre 1 y 30').toInt(),
  body('semester').trim().isLength({ max: 20 }).withMessage('Cuatrimestre demasiado largo'),
];

const evaluationRules = [
  body('name').trim().notEmpty().withMessage('El nombre de la evaluación es obligatorio').isLength({ max: 60 }),
  body('grade')
    .optional({ values: 'falsy' })
    .isInt({ min: 2, max: 5 })
    .withMessage('La nota debe ser un número de 2 a 5')
    .toInt(),
];

module.exports = { registerRules, loginRules, taskRules, subjectRules, evaluationRules };
