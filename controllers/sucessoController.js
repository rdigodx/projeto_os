exports.showSucesso = (req, res) => {
  const token = req.session.tokenGerado;

  if (!token) {
    req.flash('warning', 'Nenhuma OS foi encontrada para exibicao.');
    return res.redirect('/nova_os');
  }

  delete req.session.tokenGerado;
  return res.render('sucesso', { token });
};
