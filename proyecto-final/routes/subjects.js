const router = require('express').Router();
const ctrl = require('../controllers/subjectController');
const { requireAuth } = require('../middlewares/auth');
const { subjectRules, evaluationRules } = require('../middlewares/validators');

router.use(requireAuth);

router.get('/', ctrl.index);
router.get('/new', ctrl.newForm);
router.post('/', subjectRules, ctrl.create);
router.get('/:id', ctrl.show);
router.get('/:id/edit', ctrl.editForm);
router.put('/:id', subjectRules, ctrl.update);
router.delete('/:id', ctrl.destroy);

router.post('/:id/evaluations', evaluationRules, ctrl.addEvaluation);
router.delete('/:id/evaluations/:evalId', ctrl.removeEvaluation);

module.exports = router;
