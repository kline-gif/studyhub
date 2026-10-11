const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const { requireAuth } = require('../middlewares/auth');
const { taskRules } = require('../middlewares/validators');

router.use(requireAuth);

router.get('/', ctrl.index);
router.get('/new', ctrl.newForm);
router.post('/', taskRules, ctrl.create);
router.get('/:id', ctrl.show);
router.get('/:id/edit', ctrl.editForm);
router.put('/:id', taskRules, ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.delete('/:id', ctrl.destroy);

module.exports = router;
