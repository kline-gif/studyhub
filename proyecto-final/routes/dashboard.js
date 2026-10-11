const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middlewares/auth');

router.get('/', requireAuth, ctrl.index);

module.exports = router;
