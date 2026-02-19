const express = require('express');
const router = express.Router();
const authController = require('../controllers/loginController');
const { verifyCsrfToken } = require('../middlewares/csrfMiddleware');

// Mostrar formulário de login
// Rota: GET /login
router.get('/', authController.showLogin);

// Processar login
// Rota: POST /login
router.post('/', verifyCsrfToken, authController.login);

// Logout
// Rota: GET /logout (acessada via /logout no navegador)
router.get('/logout', authController.logout);


module.exports = router;
