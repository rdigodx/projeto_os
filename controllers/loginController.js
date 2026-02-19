const bcrypt = require('bcrypt');
const TecnicoModel = require('../models/tecnicoModel');
const { logger, logAuditoria } = require('../utils/logger');
const { issueCsrfToken } = require('../middlewares/csrfMiddleware');

let tentativasLogin = {};

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 10;
const HASH_BCRYPT_REGEX = /^\$2[aby]\$/;

const registrarFalha = (chave, usuario, agora, req) => {
  tentativasLogin[chave] = tentativasLogin[chave] || { count: 0 };
  tentativasLogin[chave].count += 1;

  if (tentativasLogin[chave].count >= MAX_TENTATIVAS) {
    tentativasLogin[chave].bloqueado = agora + BLOQUEIO_MINUTOS * 60 * 1000;
    logAuditoria('Login bloqueado por excesso de tentativas', usuario);
    req.flash('error', 'Muitas tentativas. Tente novamente em alguns minutos.');
    return;
  }

  logAuditoria('Tentativa de login falhou', usuario);
  req.flash('error', 'Usuario ou senha invalidos.');
};

exports.showLogin = (req, res) => {
  res.render('login');
};

exports.login = async (req, res) => {
  try {
    const usuario = String(req.body.usuario || '').trim();
    const senha = String(req.body.senha || '');

    if (!usuario || !senha) {
      req.flash('error', 'Informe usuario e senha.');
      return res.redirect('/login');
    }

    const ip = req.ip || req.connection.remoteAddress;
    const chave = `${usuario}_${ip}`;
    const agora = Date.now();

    if (tentativasLogin[chave] && tentativasLogin[chave].bloqueado) {
      if (agora < tentativasLogin[chave].bloqueado) {
        req.flash('error', 'Muitas tentativas. Tente novamente em alguns minutos.');
        return res.redirect('/login');
      }
      delete tentativasLogin[chave];
    }

    const tecnico = await TecnicoModel.findByUsuario(usuario);
    if (!tecnico) {
      registrarFalha(chave, usuario, agora, req);
      return res.redirect('/login');
    }

    const senhaBd = String(tecnico.senha || '');
    let sucesso = false;

    // Migra senha legada em texto puro no primeiro login bem-sucedido.
    if (!HASH_BCRYPT_REGEX.test(senhaBd)) {
      if (senha === senhaBd) {
        const novaHash = await bcrypt.hash(senha, 10);
        await TecnicoModel.updateSenha(tecnico.id, novaHash);
        sucesso = true;
      }
    } else {
      sucesso = await bcrypt.compare(senha, senhaBd);
    }

    if (!sucesso) {
      registrarFalha(chave, usuario, agora, req);
      return res.redirect('/login');
    }

    return req.session.regenerate((sessionErr) => {
      if (sessionErr) {
        logger.error('Erro ao regenerar sessao no login:', sessionErr);
        req.flash('error', 'Nao foi possivel iniciar sua sessao.');
        return res.redirect('/login');
      }

      req.session.tecnico = { id: tecnico.id, usuario: tecnico.usuario, nome: tecnico.nome };
      issueCsrfToken(req);
      delete tentativasLogin[chave];
      logAuditoria('Login realizado', tecnico.usuario);

      return req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Erro ao salvar sessao apos login:', saveErr);
          req.flash('error', 'Nao foi possivel concluir o login.');
          return res.redirect('/login');
        }
        return res.redirect('/painel');
      });
    });
  } catch (err) {
    logAuditoria('Erro no login', req.body.usuario || 'desconhecido');
    logger.error('Erro no login:', err);
    req.flash('error', 'Ocorreu um erro ao tentar fazer o login.');
    return res.redirect('/login');
  }
};

exports.logout = (req, res) => {
  if (!req.session) {
    return res.redirect('/login');
  }

  if (req.session.tecnico) {
    logAuditoria('Logout realizado', req.session.tecnico.usuario);
  }

  return req.session.destroy((err) => {
    if (err) {
      logger.error('Erro ao destruir sessao no logout:', err);
    }
    res.clearCookie('os.sid');
    return res.redirect('/login');
  });
};
