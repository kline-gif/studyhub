const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const { guestOnly, requireAuth } = require('../middlewares/auth');
const { registerRules, loginRules } = require('../middlewares/validators');

// Limita intentos de login/registro (protección básica contra fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos, inténtalo de nuevo en unos minutos.',
});

router.get('/register', guestOnly, ctrl.showRegister);
router.post('/register', authLimiter, guestOnly, registerRules, ctrl.register);
router.get('/login', guestOnly, ctrl.showLogin);
router.post('/login', authLimiter, guestOnly, loginRules, ctrl.login);
router.post('/logout', requireAuth, ctrl.logout);

module.exports = router;
