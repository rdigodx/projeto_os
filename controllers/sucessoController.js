// c:\projeto_os\controllers\sucessoController.js

/**
 * Controller para exibir a página de sucesso.
 */

// Função que renderiza a página de sucesso.
exports.showSucesso = (req, res) => {
  // Recupera o token da OS, que foi armazenado na sessão pelo 'osController' após a criação.
  const token = req.session.tokenGerado;

  // Remove o token da sessão. Isso é importante para que ele não seja exibido novamente
  // se o usuário recarregar a página ou navegar para outras partes do site e voltar.
  delete req.session.tokenGerado;

  // Renderiza a view 'sucesso.ejs' e passa a variável 'token' para que ela possa ser exibida na página.
  res.render('sucesso', { token: token });
};