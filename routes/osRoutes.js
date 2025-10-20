const express = require('express');
const router = express.Router();
const osController = require('../controllers/osController');
const upload = require('../middlewares/uploadMiddleware');
const { isAuth } = require('../middlewares/authMiddleware');

// Criar nova OS (rota pública, acessada via POST /os/criar)
router.post('/criar', upload.array('anexos', 5), osController.criarOs);

// Rotas protegidas (somente técnicos logados)
router.post('/fechar/:id', isAuth, osController.fechar);
router.get('/baixar-anexo/:arquivoId', isAuth, osController.baixarAnexo);
router.post('/editar/:id', isAuth, osController.editarOs);
router.post('/excluir/:id', isAuth, osController.excluirOs);

// Listar todas as OS em JSON (agora protegida por autenticação)
router.get('/listar', isAuth, osController.listarOs);

module.exports = router;