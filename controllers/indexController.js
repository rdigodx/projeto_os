const UsuarioModel = require('../models/usuarioModel');
const OrdemModel = require('../models/ordemModel');

// Página inicial
exports.index = async (req, res) => {
  try {
    const usuarios = await UsuarioModel.findAll();
    res.render('index', {
      usuarios,
      ordem: null,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Erro ao carregar página inicial:', err);
    req.flash('danger', 'Erro ao carregar página inicial.');
    res.render('index', { usuarios: [], ordem: null, messages: req.flash() });
  }
};

// Ordenar usuários por coluna
exports.ordenar = async (req, res) => {
  const ordem = req.params.ordem;
  const colunasValidas = ['nome', 'email', 'data_criacao'];
  if (!colunasValidas.includes(ordem)) {
    req.flash('danger', 'Coluna inválida para ordenação.');
    return res.redirect('/');
  }
  try {
    const usuarios = await UsuarioModel.findAll({ order: [[ordem, 'ASC']] });
    res.render('index', {
      usuarios,
      ordem,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Erro ao ordenar usuários:', err);
    req.flash('danger', 'Erro ao ordenar usuários.');
    res.redirect('/');
  }
};

// Formulário para nova OS
exports.novaOsForm = (req, res) => {
  res.render('nova_os', { messages: req.flash() });
};

// Página 404
exports.paginaNaoEncontrada = (req, res) => {
  res.status(404).render('404', {
    messages: req.flash(),
    url: req.originalUrl
  });
};

// Tratamento de erro 500
exports.erroServidor = (err, req, res, next) => {
  console.error('Erro no servidor:', err);
  req.flash('danger', 'Erro no servidor.');
  res.redirect('/');
};
