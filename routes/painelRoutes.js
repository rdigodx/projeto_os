// Importa o Express para criar rotas
const express = require('express');
// Cria um roteador
const router = express.Router();
// Importa o controlador do painel
const painelController = require('../controllers/painelController');
// Importa middleware que verifica se o usuário está autenticado
const { isAuth } = require('../middlewares/authMiddleware');

// ROTA: Painel técnico (somente acessível se estiver logado)
// Método: GET
// URL: /painel
router.get('/', isAuth, painelController.painel); 

// Exporta o roteador para uso no servidor
module.exports = router;