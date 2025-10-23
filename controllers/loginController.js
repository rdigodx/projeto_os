// Importa a biblioteca bcrypt para criptografia e verificação de senhas.
const bcrypt = require('bcrypt');
// Importa o modelo de dados do Técnico para interagir com o banco de dados.
const TecnicoModel = require('../models/tecnicoModel');
// Importa a função de log de auditoria para registrar eventos importantes.
const { logger, logAuditoria } = require('../utils/logger');

// Objeto para controlar as tentativas de login em memória. A chave é uma combinação de usuário e IP.
let tentativasLogin = {};
// Número máximo de tentativas de login permitidas antes do bloqueio.
const MAX_TENTATIVAS = 5;
// Duração do bloqueio em minutos.
const BLOQUEIO_MINUTOS = 10;

// Função para exibir a página de login.
exports.showLogin = (req, res) => {
  // Apenas renderiza a view 'login.ejs'. As mensagens flash já estão disponíveis em res.locals.messages
  res.render('login');
};

// Função para processar a tentativa de login.
exports.login = async (req, res) => {
  try {
    // Extrai 'usuario' e 'senha' do corpo da requisição.
    const { usuario, senha } = req.body;
    // Obtém o endereço IP do cliente para o controle de tentativas.
    const ip = req.ip || req.connection.remoteAddress;
    // Cria uma chave única para o controle de tentativas, combinando usuário e IP.
    const chave = `${usuario}_${ip}`;
    // Pega o timestamp atual.
    const agora = Date.now();

    // Verifica se já existe um registro de tentativa para esta chave e se está bloqueado.
    if (tentativasLogin[chave] && tentativasLogin[chave].bloqueado) {
      // Se o tempo de bloqueio ainda não passou.
      if (agora < tentativasLogin[chave].bloqueado) {
        // Informa o usuário sobre o bloqueio e redireciona para a página de login.
        req.flash('error', 'Muitas tentativas. Tente novamente em alguns minutos.');
        return res.redirect('/login');
      } else {
        // Se o tempo de bloqueio já passou, remove o registro de tentativa para permitir um novo login.
        delete tentativasLogin[chave];
      }
    }

    // Busca o técnico no banco de dados pelo nome de usuário.
    const tecnico = await TecnicoModel.findByUsuario(usuario);
    // Se o técnico não for encontrado, a tentativa de login falha.
    if (!tecnico) {
      logAuditoria('Tentativa de login falhou', usuario);
      req.flash('error', 'Usuário ou senha inválidos.');
      return res.redirect('/login');
    }

    // Pega a senha armazenada no banco de dados.
    const senha_bd = tecnico.senha;
    // Flag para indicar se o login foi bem-sucedido.
    let sucesso = false;

    // Verifica se a senha no banco de dados não está hasheada (sistema legado).
    if (!senha_bd.startsWith('$2b$')) {
      if (senha === senha_bd) {
        const novaHash = await bcrypt.hash(senha, 10);
        await TecnicoModel.updateSenha(tecnico.id, novaHash);
        sucesso = true;
      }
    } else {
      // Se a senha estiver hasheada, compara a senha fornecida com a hash do banco.
      sucesso = await bcrypt.compare(senha, senha_bd);
    }

    // Se a senha estiver correta.
    if (sucesso) {
      // Armazena informações do técnico na sessão para autenticação.
      req.session.tecnico = { id: tecnico.id, usuario: tecnico.usuario, nome: tecnico.nome };
      logAuditoria('Login realizado', tecnico.usuario);
      // Limpa o registro de tentativas de login para este usuário/IP.
      delete tentativasLogin[chave];
      // Redireciona para o painel de controle.
      return res.redirect('/painel');
    } else {
      // Se a senha estiver incorreta, incrementa o contador de tentativas.
      tentativasLogin[chave] = tentativasLogin[chave] || { count: 0 };
      tentativasLogin[chave].count++;
      // Se o número de tentativas atingir o máximo.
      if (tentativasLogin[chave].count >= MAX_TENTATIVAS) {
        // Bloqueia o login por um tempo determinado.
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
  // Verifica se existe uma sessão de técnico ativa.
  if (req.session.tecnico) {
    logAuditoria('Logout realizado', req.session.tecnico.usuario);
    // Destrói a sessão.
    req.session.destroy();
  }
  // Redireciona para a página de login.
  res.redirect('/login');
};