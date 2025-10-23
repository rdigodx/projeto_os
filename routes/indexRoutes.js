const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController');

// Rota para a página inicial
router.get('/', indexController.index);

// Rota para o formulário de nova OS
router.get('/nova_os', indexController.novaOsForm);

// Rota pública da API para listar OSs (usada pelo indexScripts.js)
router.get('/os/listar', indexController.listarOs);

module.exports = router;