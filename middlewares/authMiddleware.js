// Middleware que verifica se o usuário (técnico) está autenticado
// Ele é usado nas rotas que exigem login, por exemplo: router.get('/painel', isAuth, painelController.index)
exports.isAuth = (req, res, next) => {
  // Verifica se existe sessão e se o objeto 'tecnico' está presente
  if (req.session && req.session.tecnico) {
    // Se estiver autenticado, chama next() para continuar para o próximo handler
    return next();
  }
  // Se não estiver autenticado, redireciona para o login com uma mensagem clara
  req.flash('warning', 'Você precisa estar logado para acessar esta página.');
  res.redirect('/login');
};