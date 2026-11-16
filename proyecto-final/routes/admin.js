const router = require('express').Router();
const { requireAdmin } = require('../middlewares/auth');
const ctrl = require('../controllers/adminController');

// TODAS las rutas de /admin exigen ser administrador
router.use(requireAdmin);

router.get('/', ctrl.index);
router.delete('/users/:id', ctrl.destroyUser);
router.delete('/subjects/:id', ctrl.destroySubject);
router.delete('/tasks/:id', ctrl.destroyTask);

module.exports = router;
