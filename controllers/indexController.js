const { logger } = require('../utils/logger');
const UsuarioModel = require('../models/usuarioModel');
const OrdemModel = require('../models/ordemModel');
const TOKEN_REGEX = /^[A-Z0-9]{6,20}$/;

// Página inicial
exports.index = async (req, res) => {
  const tokenInformado = String(req.query.token || '').trim().toUpperCase();
  let ordem = null;
  let consultaErro = null;

  try {
    if (tokenInformado) {
      if (!TOKEN_REGEX.test(tokenInformado)) {
        consultaErro = 'Token invalido. Confira e tente novamente.';
      } else {
        ordem = await OrdemModel.findByTokenPublic(tokenInformado);
        if (!ordem) {
          consultaErro = 'Nenhuma Ordem de Servico encontrada para o token informado.';
        }
      }
    }

    res.render('index', {
      ordem,
      tokenInformado,
      consultaErro
    });
  } catch (err) {
    logger.error('Erro ao carregar página inicial:', err);
    req.flash('danger', 'Erro ao carregar página inicial.');
    res.render('index', {
      ordem: null,
      tokenInformado,
      consultaErro: 'Nao foi possivel consultar a Ordem de Servico neste momento.'
    });
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
      ordem
    });
  } catch (err) {
    logger.error('Erro ao ordenar usuários:', err);
    req.flash('danger', 'Erro ao ordenar usuários.');
    res.redirect('/');
  }
};

// Formulário para nova OS
exports.novaOsForm = (req, res) => {
  res.render('nova_os');
};

// Página 404
exports.paginaNaoEncontrada = (req, res) => {
  res.status(404).render('404', {
    url: req.originalUrl
  });
};

// Tratamento de erro 500
exports.erroServidor = (err, req, res, next) => {
  logger.error('Erro no servidor:', err);
  req.flash('danger', 'Erro no servidor.');
  res.redirect('/');
};

// Função para listar todas as OS para a API pública.
exports.listarOs = async (req, res) => {
  try {
    const ordens = await OrdemModel.findByFiltro();
    res.json(ordens);
  } catch (err) {
    logger.error('Erro ao listar OSs para a API:', err);
    res.status(500).json({ error: 'Erro ao listar OSs' });
  }
};
