const express = require('express');
const router = express.Router();

// Rota para renderizar a tela de sucesso usando token da sessão
router.get('/', (req, res) => {
  const token = req.session.tokenGerado;

  if (!token) {
    req.flash('danger', 'Nenhuma OS encontrada.');
    return res.redirect('/nova_os');
  }

  // Limpa o token da sessão depois de usar
  req.session.tokenGerado = null;

  res.render('sucesso', { token });
});

module.exports = router;
