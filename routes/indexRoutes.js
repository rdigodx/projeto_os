const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Página inicial
router.get('/', indexController.index);

// Ordenar usuários
router.get('/ordenar/:ordem', indexController.ordenar);

// Formulário de nova OS
router.get('/nova_os', indexController.novaOsForm);


module.exports = router;
