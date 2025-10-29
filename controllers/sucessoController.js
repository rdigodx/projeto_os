
// Função que renderiza a página de sucesso.
exports.showSucesso = (req, res) => {

  
  // Recupera o token da OS, que foi armazenado na sessão pelo 'osController' após a criação.
  const token = req.session.tokenGerado;

  // Remove o token da sessão. Isso é importante para que ele não seja exibido novamente
  delete req.session.tokenGerado;

  // Renderiza a view 'sucesso.ejs' e passa a variável 'token' para que ela possa ser exibida na página.
  res.render('sucesso', { token: token });
};