// Importa o framework Express.
const express = require('express');
// Cria uma instância do roteador do Express.
const router = express.Router();
// Importa o controlador que contém a lógica para gerar relatórios.
const relatorioController = require('../controllers/relatorioController');
// Importa o middleware de autenticação para proteger a rota.
const { isAuth } = require('../middlewares/authMiddleware');
const { verifyCsrfToken } = require('../middlewares/csrfMiddleware');

// Define a rota para gerar o relatório.
// - Método: POST, pois recebe dados (mês e ano) do corpo da requisição.
// - URL: '/', que será combinada com o prefixo '/relatorio' definido em server.js, resultando em '/relatorio'.
// - Middleware 'isAuth': é executado antes do controller para garantir que apenas usuários autenticados (técnicos) possam acessar esta rota.
// - Controller 'relatorioController.gerar': é a função que será executada se o usuário estiver autenticado.
router.post('/', isAuth, verifyCsrfToken, relatorioController.gerar);

// Exporta o roteador configurado para ser usado no arquivo principal do servidor (server.js).
module.exports = router;
