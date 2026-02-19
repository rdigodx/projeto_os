const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { enviarEmail } = require('../utils/email');
const { logger, logAuditoria } = require('../utils/logger');
const OrdemModel = require('../models/ordemModel');
const UsuarioModel = require('../models/usuarioModel');
const AnexoModel = require('../models/anexoModel');
const TecnicoModel = require('../models/tecnicoModel');

const STATUS_VALIDOS = new Set(['Nova', 'Pendente', 'Concluída']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIORIDADES = {
  baixa: { label: 'Baixa', horas: 10 },
  media: { label: 'Média', horas: 5 },
  alta: { label: 'Alta', horas: 2 },
  critica: { label: 'Crítica', horas: 1 },
};
const PRIORIDADE_DEFAULT = 'media';

const normalizeText = (value, maxLength = 500) =>
  String(value || '').trim().slice(0, maxLength);

const normalizeKey = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolvePrioridade = (value) => {
  const key = normalizeKey(value);
  return PRIORIDADES[key] || PRIORIDADES[PRIORIDADE_DEFAULT];
};

const calcularPrazoLimite = (horas) => {
  const now = Date.now();
  return new Date(now + Number(horas || 0) * 60 * 60 * 1000);
};

const isValidId = (value) => Number.isInteger(Number(value)) && Number(value) > 0;

const limparArquivosUpload = (files = []) => {
  for (const file of files) {
    try {
      const caminho = path.join(__dirname, '..', 'uploads', path.basename(file.filename));
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
      }
    } catch (err) {
      logger.error('Falha ao remover arquivo de upload apos erro:', err);
    }
  }
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

module.exports = {
  criarOs: async (req, res) => {
    let connection;

    try {
      const nome = normalizeText(req.body.nome || 'Anônimo', 120) || 'Anônimo';
      const setor = normalizeText(req.body.setor, 120);
      const tipoServico = normalizeText(req.body.tipo_servico, 120);
      const descricao = normalizeText(req.body.descricao, 2000);
      const emailFormulario = normalizeText(req.body.email, 180).toLowerCase();
      const prioridadeInfo = resolvePrioridade(req.body.prioridade);
      const prioridade = prioridadeInfo.label;
      const prazoLimite = calcularPrazoLimite(prioridadeInfo.horas);

      if (!setor || !tipoServico || !descricao) {
        req.flash('danger', 'Preencha os campos obrigatorios.');
        limparArquivosUpload(req.files);
        return res.redirect('/nova_os');
      }

      if (emailFormulario && !EMAIL_REGEX.test(emailFormulario)) {
        req.flash('danger', 'Informe um e-mail valido para notificacao.');
        limparArquivosUpload(req.files);
        return res.redirect('/nova_os');
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      let usuario = await UsuarioModel.findByNome(nome, connection);
      if (!usuario) {
        usuario = await UsuarioModel.create(
          {
            nome,
            email: emailFormulario || null,
          },
          connection
        );
      }

      let emailDestinatario = emailFormulario || usuario.email || null;
      if (emailFormulario && !usuario.email) {
        await UsuarioModel.updateEmailIfEmpty(usuario.id, emailFormulario, connection);
      }

      const os = await OrdemModel.create(
        {
          solicitante_id: usuario.id,
          setor,
          tipo_servico: tipoServico,
          descricao,
          prioridade,
          prazo_limite: prazoLimite,
        },
        connection
      );

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await AnexoModel.create(
            {
              os_id: os.id,
              nome_arquivo: file.originalname,
              caminho_arquivo: file.filename,
            },
            connection
          );
        }
      }

      await connection.commit();

      const protocolo = req.secure ? 'https' : 'http';
      const baseUrl = process.env.BASE_URL || `${protocolo}://${req.get('host')}`;
      const nomeHtml = escapeHtml(nome);
      const setorHtml = escapeHtml(setor);
      const tipoHtml = escapeHtml(tipoServico);
      const prioridadeHtml = escapeHtml(prioridade);
      const prazoLimiteHtml = escapeHtml(prazoLimite.toLocaleString('pt-BR'));
      const descricaoHtml = escapeHtml(descricao);

      if (emailDestinatario) {
        const corpoEmailSolicitante = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; padding: 25px;">
            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 25px;">
              <h2 style="color: #004488; margin: 0;">Nova Ordem de Servico Criada</h2>
            </div>
            <p>Ola, <strong>${nomeHtml}</strong>,</p>
            <p>Sua solicitacao foi registrada com sucesso em nosso sistema. Abaixo estao os detalhes da sua Ordem de Servico:</p>
            <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #0056b3;">Detalhes da Solicitacao</h3>
              <p><strong>Token de Acompanhamento:</strong> <span style="font-size: 1.2em; font-weight: bold; color: #dc3545;">${os.token}</span></p>
              <p><strong>Setor:</strong> ${setorHtml}</p>
              <p><strong>Tipo de Servico:</strong> ${tipoHtml}</p>
              <p><strong>Prioridade:</strong> ${prioridadeHtml}</p>
              <p><strong>Prazo SLA:</strong> ${prazoLimiteHtml}</p>
              <p><strong>Descricao:</strong></p>
              <p style="padding-left: 15px; border-left: 3px solid #ccc; margin: 10px 0; font-style: italic;">${descricaoHtml}</p>
            </div>
            <p>Guarde o seu <strong>token</strong>. Com ele, voce podera consultar o status da sua solicitacao a qualquer momento em nosso portal.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${baseUrl}" style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Portal</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.9em; color: #777; text-align: center;">Atenciosamente,<br>Equipe de Suporte - MBM Copy</p>
          </div>
        `;

        enviarEmail([emailDestinatario], `Nova OS #${os.token} Criada`, corpoEmailSolicitante)
          .then(() => logger.info(`E-mail de confirmacao enviado para o solicitante: ${emailDestinatario}`))
          .catch((err) => logger.error('Erro ao enviar e-mail para o solicitante:', err));
      }

      const corpoEmailTecnicos = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #004488;">Nova Ordem de Servico Recebida</h2>
          <p>Uma nova OS foi aberta e precisa de atencao.</p>
          <div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p><strong>Solicitante:</strong> ${nomeHtml}</p>
            <p><strong>Setor:</strong> ${setorHtml}</p>
            <p><strong>Tipo de Servico:</strong> ${tipoHtml}</p>
            <p><strong>Prioridade:</strong> ${prioridadeHtml}</p>
            <p><strong>Prazo SLA:</strong> ${prazoLimiteHtml}</p>
            <p><strong>Descricao:</strong> ${descricaoHtml}</p>
            <p><strong>Token:</strong> ${os.token}</p>
          </div>
          <p>Acesse o painel para visualizar e gerenciar a solicitacao.</p>
          <div style="text-align: left; margin-top: 20px;">
            <a href="${baseUrl}/painel" style="background-color: #28a745; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Painel Tecnico</a>
          </div>
        </div>
      `;

      const emailsTecnicos = await TecnicoModel.findAllEmails();
      const destinatariosTecnicos = [
        process.env.EMAIL_ADMIN_1,
        process.env.EMAIL_ADMIN_2,
        ...emailsTecnicos,
      ].filter((value, index, self) => value && self.indexOf(value) === index);

      if (destinatariosTecnicos.length > 0) {
        enviarEmail(destinatariosTecnicos, `[NOVA OS] #${os.token} - ${tipoServico}`, corpoEmailTecnicos)
          .then(() => logger.info('E-mail de notificacao enviado para a equipe tecnica.'))
          .catch((err) => logger.error('Erro ao enviar e-mail para a equipe tecnica:', err));
      }

      req.session.tokenGerado = os.token;
      return req.session.save((sessionErr) => {
        if (sessionErr) {
          logger.error('Falha ao salvar sessao apos criar OS:', sessionErr);
          return res.render('sucesso', { token: os.token });
        }
        return res.redirect('/sucesso');
      });
    } catch (err) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          logger.error('Erro ao fazer rollback na criacao de OS:', rollbackErr);
        }
      }
      limparArquivosUpload(req.files);
      logger.error('Erro ao criar OS:', err);
      req.flash('danger', 'Erro ao criar a OS.');
      return res.redirect('/nova_os');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },

  fechar: async (req, res) => {
    try {
      const { id } = req.params;
      const resolucao = normalizeText(req.body.resolucao, 2000);
      const tecnico = req.session.tecnico.nome;

      if (!isValidId(id)) {
        req.flash('danger', 'OS invalida.');
        return res.redirect('/painel');
      }

      if (!resolucao) {
        req.flash('danger', 'Informe a resolucao para concluir a OS.');
        return res.redirect('/painel');
      }

      const os = await OrdemModel.findById(id);
      if (!os) {
        req.flash('danger', 'OS nao encontrada.');
        return res.redirect('/painel');
      }

      await OrdemModel.fechar({ id, resolucao, tecnico });
      logAuditoria(`OS #${os.token} concluida`, tecnico);

      if (os.email_solicitante) {
        const corpoEmail = `
          <p>Ola,</p>
          <p>A Ordem de Servico com o token <b>${os.token}</b> foi concluida.</p>
          <p><b>Resolucao:</b> ${escapeHtml(resolucao)}</p>
          <p>Obrigado!</p>
        `;

        enviarEmail([os.email_solicitante], `OS #${os.token} Concluida`, corpoEmail)
          .then(() => logger.info(`E-mail de conclusao enviado para ${os.email_solicitante}`))
          .catch((err) => logger.error('Erro ao enviar e-mail de conclusao:', err));
      }

      req.flash('success', 'OS fechada com sucesso.');
      return res.redirect('/painel');
    } catch (err) {
      logger.error('Erro ao fechar OS:', err);
      req.flash('danger', 'Erro ao fechar OS.');
      return res.redirect('/painel');
    }
  },

  baixarAnexo: async (req, res) => {
    try {
      const { arquivoId } = req.params;
      if (!isValidId(arquivoId)) {
        return res.status(400).send('Identificador de arquivo invalido');
      }

      const arquivo = await AnexoModel.findById(arquivoId);
      if (!arquivo) {
        return res.status(404).send('Arquivo nao encontrado');
      }

      const arquivoSeguro = path.basename(arquivo.caminho_arquivo);
      const caminho = path.join(__dirname, '..', 'uploads', arquivoSeguro);
      if (!fs.existsSync(caminho)) {
        return res.status(404).send('Arquivo nao encontrado no servidor');
      }

      return res.download(caminho, arquivo.nome_arquivo);
    } catch (err) {
      logger.error('Erro ao baixar anexo:', err);
      return res.status(500).send('Erro ao baixar anexo');
    }
  },

  editarOs: async (req, res) => {
    try {
      const { id } = req.params;
      const setor = normalizeText(req.body.setor, 120);
      const tipoServico = normalizeText(req.body.tipo_servico, 120);
      const descricao = normalizeText(req.body.descricao, 2000);
      const status = normalizeText(req.body.status, 30);

      if (!isValidId(id)) {
        req.flash('danger', 'OS invalida.');
        return res.redirect('/painel');
      }

      if (!setor || !tipoServico || !descricao || !STATUS_VALIDOS.has(status)) {
        req.flash('danger', 'Dados invalidos para edicao da OS.');
        return res.redirect('/painel');
      }

      await OrdemModel.editar({ id, setor, tipo_servico: tipoServico, descricao, status });
      req.flash('success', 'OS editada com sucesso.');
      return res.redirect('/painel');
    } catch (err) {
      logger.error('Erro ao editar OS:', err);
      req.flash('danger', 'Erro ao editar OS.');
      return res.redirect('/painel');
    }
  },

  excluirOs: async (req, res) => {
    let connection;

    try {
      const { id } = req.params;
      if (!isValidId(id)) {
        req.flash('danger', 'OS invalida.');
        return res.redirect('/painel');
      }

      connection = await pool.getConnection();
      await connection.beginTransaction();

      const anexos = await AnexoModel.findByOsId(id, connection);
      await AnexoModel.deleteByOsId(id, connection);
      await OrdemModel.excluir(id, connection);
      await connection.commit();

      for (const anexo of anexos) {
        const caminhoArquivo = path.join(__dirname, '..', 'uploads', path.basename(anexo.caminho_arquivo));
        try {
          if (fs.existsSync(caminhoArquivo)) {
            fs.unlinkSync(caminhoArquivo);
          }
        } catch (fileErr) {
          logger.error(`Erro ao excluir anexo fisico ${caminhoArquivo}:`, fileErr);
        }
      }

      req.flash('success', 'OS e seus anexos excluidos com sucesso.');
      return res.redirect('/painel');
    } catch (err) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackErr) {
          logger.error('Erro ao fazer rollback na exclusao de OS:', rollbackErr);
        }
      }
      logger.error('Erro ao excluir OS:', err);
      req.flash('danger', 'Erro ao excluir OS.');
      return res.redirect('/painel');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
};
