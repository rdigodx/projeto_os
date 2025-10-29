
const bcrypt = require('bcrypt');
const TecnicoModel = require('../models/tecnicoModel');
const { logger, logAuditoria } = require('../utils/logger');

// Objeto para controlar as tentativas de login em memória.

let tentativasLogin = {};

const MAX_TENTATIVAS = 5;

const BLOQUEIO_MINUTOS = 10;

// Função para exibir a página de login.
exports.showLogin = (req, res) => {
  res.render('login');
};

// Função para processar a tentativa de login.
exports.login = async (req, res) => {
  try {
    const { usuario, senha } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const chave = `${usuario}_${ip}`;
    const agora = Date.now();

    if (tentativasLogin[chave] && tentativasLogin[chave].bloqueado) {
      if (agora < tentativasLogin[chave].bloqueado) {
        req.flash('error', 'Muitas tentativas. Tente novamente em alguns minutos.');
        return res.redirect('/login');
      } else {
        delete tentativasLogin[chave];
      }
    }

    // Busca o técnico no banco de dados pelo nome de usuário.
    const tecnico = await TecnicoModel.findByUsuario(usuario);

    if (!tecnico) {
      logAuditoria('Tentativa de login falhou', usuario);
      req.flash('error', 'Usuário ou senha inválidos.');
      return res.redirect('/login');
    }

    // Pega a senha armazenada no banco de dados.
    const senha_bd = tecnico.senha;


    // Flag para indicar se a senha está correta.
    let sucesso = false;


    // Verifica se a senha no banco de dados não está hasheada (sistema legado).
    if (!senha_bd.startsWith('$2b$')) {
      if (senha === senha_bd) {
        const novaHash = await bcrypt.hash(senha, 10);
        await TecnicoModel.updateSenha(tecnico.id, novaHash);
        sucesso = true;
      }
    } else {
      sucesso = await bcrypt.compare(senha, senha_bd);
    }

    // Se a senha estiver correta.
    if (sucesso) {
      req.session.tecnico = { id: tecnico.id, usuario: tecnico.usuario, nome: tecnico.nome };
      logAuditoria('Login realizado', tecnico.usuario);
      delete tentativasLogin[chave];
      return res.redirect('/painel');
    } else {
      tentativasLogin[chave] = tentativasLogin[chave] || { count: 0 };
      tentativasLogin[chave].count++;
      // Se o número de tentativas atingir o máximo.
      if (tentativasLogin[chave].count >= MAX_TENTATIVAS) {

        tentativasLogin[chave].bloqueado = agora + BLOQUEIO_MINUTOS * 60 * 1000;
        logAuditoria('Login bloqueado por excesso de tentativas', usuario);
        req.flash('error', 'Muitas tentativas. Tente novamente em alguns minutos.');
      } else {
        logAuditoria('Tentativa de login falhou', usuario);
        req.flash('error', 'Usuário ou senha inválidos.');
      }
      return res.redirect('/login');
    }
  } catch (err) {
    // Em caso de erro no servidor.
    logAuditoria('Erro no login', req.body.usuario || 'desconhecido');
    logger.error('Erro no login:', err);
    req.flash('error', 'Ocorreu um erro ao tentar fazer o login.');
    res.redirect('/login');
  }
};

// Função para fazer logout.
exports.logout = (req, res) => {
  if (req.session.tecnico) {
    logAuditoria('Logout realizado', req.session.tecnico.usuario);
    req.session.destroy();
  }
  res.redirect('/login');
};