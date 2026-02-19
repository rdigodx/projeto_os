const express = require('express');
const router = express.Router();
const osController = require('../controllers/osController');
const upload = require('../middlewares/uploadMiddleware');
const { isAuth } = require('../middlewares/authMiddleware');
const { verifyCsrfToken } = require('../middlewares/csrfMiddleware');

// Criar nova OS (rota pública, acessada via POST /os/criar)
router.post('/criar', upload.array('anexos', 5), verifyCsrfToken, osController.criarOs);

// Rotas protegidas (somente técnicos logados)
router.post('/fechar/:id', isAuth, verifyCsrfToken, osController.fechar);
router.get('/baixar-anexo/:arquivoId', isAuth, osController.baixarAnexo);
router.post('/editar/:id', isAuth, verifyCsrfToken, osController.editarOs);
router.post('/excluir/:id', isAuth, verifyCsrfToken, osController.excluirOs);

module.exports = router;
