// Importa o módulo 'path' para lidar com caminhos de arquivos.
const path = require('path');
// Importa o módulo 'fs' (File System) para interagir com o sistema de arquivos.
const fs = require('fs');
// Importa a função de envio de e-mail do nosso utilitário.
const { enviarEmail } = require('../utils/email');
// Importa a função de log de auditoria.
const { logAuditoria } = require('../utils/logger');
// Importa os modelos de dados para interagir com o banco.
const OrdemModel = require('../models/ordemModel');
const UsuarioModel = require('../models/usuarioModel');
const AnexoModel = require('../models/anexoModel');
const TecnicoModel = require('../models/tecnicoModel');

// Exporta um objeto com todas as funções do controller.
module.exports = {
  // Função assíncrona para criar uma nova Ordem de Serviço.
  criarOs: async (req, res) => {
    try {
      // Extrai os dados do corpo da requisição. Renomeia 'email' para 'emailFormulario' para clareza.
      const { nome, setor, tipo_servico, descricao, email: emailFormulario } = req.body;      
      // Define um nome padrão 'Anônimo' se nenhum nome for fornecido.
      const nomeValido = nome || 'Anônimo';

      // Busca o usuário no banco de dados pelo nome.
      let usuario = await UsuarioModel.findByNome(nomeValido);
      // Variável para guardar o e-mail que receberá a notificação.
      let emailDestinatario = emailFormulario;

      // Se o usuário não existir e o nome não for 'Anônimo', cria um novo usuário.
      if (!usuario && nomeValido !== 'Anônimo') {
        usuario = await UsuarioModel.create({
          nome: nomeValido,
          // Salva o e-mail fornecido no formulário, ou null se não houver.
          email: emailFormulario || null
        });
      } else {
        // Se o usuário já existe, verifica como definir o e-mail de destino.
        if (!emailDestinatario && usuario.email) {
          // Se nenhum e-mail foi passado no formulário, usa o e-mail já cadastrado no banco.
          emailDestinatario = usuario.email;
        } else if (emailFormulario && !usuario.email) {
          // Se um e-mail foi passado no formulário e o usuário não tinha um, atualiza o cadastro.
          await UsuarioModel.updateEmailIfEmpty(usuario.id, emailFormulario);
        }
      }

      // Cria a Ordem de Serviço no banco de dados, associando ao ID do usuário.
      const os = await OrdemModel.create({
        solicitante_id: usuario.id,
        setor,
        tipo_servico,
        descricao
      });

      // Verifica se foram enviados arquivos (anexos).
      if (req.files && req.files.length > 0) {
        // Itera sobre cada arquivo enviado.
        for (const file of req.files) {
          // Cria um registro para o anexo no banco de dados, associando à OS criada.
          await AnexoModel.create({
            os_id: os.id,
            nome_arquivo: file.originalname,
            caminho_arquivo: file.filename
          });
        }
      }

      // Define a URL base da aplicação para usar nos links do e-mail.
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      // Se houver um e-mail de destinatário, prepara e envia a notificação.
      if (emailDestinatario) {
        const corpoEmailSolicitante = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; padding: 25px;">
            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 25px;">
              <h2 style="color: #004488; margin: 0;">Nova Ordem de Serviço Criada</h2>
            </div>
            <p>Olá, <strong>${nomeValido}</strong>,</p>
            <p>Sua solicitação foi registrada com sucesso em nosso sistema. Abaixo estão os detalhes da sua Ordem de Serviço:</p>
            <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #0056b3;">Detalhes da Solicitação</h3>
              <p><strong>Token de Acompanhamento:</strong> <span style="font-size: 1.2em; font-weight: bold; color: #dc3545;">${os.token}</span></p>
              <p><strong>Setor:</strong> ${setor}</p>
              <p><strong>Tipo de Serviço:</strong> ${tipo_servico}</p>
              <p><strong>Descrição:</strong></p>
              <p style="padding-left: 15px; border-left: 3px solid #ccc; margin: 10px 0; font-style: italic;">${descricao}</p>
            </div>
            <p>Guarde o seu <strong>token</strong>. Com ele, você poderá consultar o status da sua solicitação a qualquer momento em nosso portal.</p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="${baseUrl}" style="background-color: #007bff; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Portal</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 0.9em; color: #777; text-align: center;">Atenciosamente,<br>Equipe de Suporte - MBM Copy</p>
          </div>
        `;
        // Chama a função de envio de e-mail (não bloqueia a execução principal).
        enviarEmail([emailDestinatario], `Nova OS #${os.token} Criada`, corpoEmailSolicitante)
          .then(() => console.log(`📧 E-mail de confirmação enviado para o solicitante: ${emailDestinatario}`))
          .catch(err => console.error('Erro ao enviar e-mail para o solicitante:', err));
      }

      // Prepara o corpo do e-mail de notificação para a equipe técnica.
      const corpoEmailTecnicos = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #004488;">Nova Ordem de Serviço Recebida</h2>
          <p>Uma nova OS foi aberta e precisa de atenção.</p>
          <div style="background-color: #f9f9f9; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <p><strong>Solicitante:</strong> ${nomeValido}</p>
            <p><strong>Setor:</strong> ${setor}</p>
            <p><strong>Tipo de Serviço:</strong> ${tipo_servico}</p>
            <p><strong>Descrição:</strong> ${descricao}</p>
            <p><strong>Token:</strong> ${os.token}</p>
          </div>
          <p>Acesse o painel para visualizar e gerenciar a solicitação.</p>
          <div style="text-align: left; margin-top: 20px;">
            <a href="${baseUrl}/painel" style="background-color: #28a745; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Painel Técnico</a>
          </div>
        </div>
      `;

      // Busca no banco os e-mails de todos os técnicos cadastrados.
      const emailsTecnicos = await TecnicoModel.findAllEmails();

      // Monta a lista de destinatários (admins do .env + técnicos do banco).
      const destinatariosTecnicos = [
        process.env.EMAIL_ADMIN_1,
        process.env.EMAIL_ADMIN_2,
        ...emailsTecnicos
      ].filter((value, index, self) => value && self.indexOf(value) === index); // Filtra para remover e-mails nulos e duplicados.

      // Se houver destinatários, envia o e-mail para a equipe.
      if (destinatariosTecnicos.length > 0) {
        enviarEmail(destinatariosTecnicos, `[NOVA OS] #${os.token} - ${tipo_servico}`, corpoEmailTecnicos)
          .then(() => console.log(`📧 E-mail de notificação enviado para a equipe técnica.`))
          .catch(err => console.error('Erro ao enviar e-mail para a equipe técnica:', err));
      }

      // Armazena o token da OS recém-criada na sessão do usuário.
      req.session.tokenGerado = os.token;
      // Salva a sessão explicitamente antes de redirecionar, para garantir que o token esteja disponível.
      req.session.save((err) => {
        if (err) return next(err); // Em caso de erro ao salvar a sessão, passa para o próximo middleware de erro.
        // Redireciona o usuário para a página de sucesso.
        res.redirect('/sucesso');
      });

    } catch (err) {
      // Se ocorrer qualquer erro durante o processo.
      console.error('Erro ao criar OS:', err);
      req.flash('danger', 'Erro ao criar a OS.');
      res.redirect('/nova_os');
    }
  },

  // Função para fechar uma OS.
  fechar: async (req, res) => {
    try {
      // Pega o ID da OS dos parâmetros da URL e a resolução do corpo da requisição.
      const { id } = req.params;
      const { resolucao } = req.body;
      // Pega o nome do técnico logado a partir da sessão.
      const tecnico = req.session.tecnico.nome;
      // Busca a OS no banco pelo ID.
      const os = await OrdemModel.findById(id);

      // Se a OS não for encontrada, exibe uma mensagem de erro.
      if (!os) {
        req.flash('danger', 'OS não encontrada.');
        return res.redirect('/painel');
      }

      // Chama o modelo para atualizar o status da OS para 'Concluída'.
      await OrdemModel.fechar({ id, resolucao, tecnico });
      // Registra a ação no log de auditoria.
      logAuditoria(`OS #${os.token} concluída`, tecnico);

      // Prepara o e-mail de notificação de conclusão para o solicitante.
      const corpoEmail = `
        <p>Olá,</p>
        <p>A Ordem de Serviço com o token <b>${os.token}</b> foi concluída.</p>
        <p><b>Resolução:</b> ${resolucao}</p>
        <p>Obrigado!</p>
      `;

      // Se o solicitante tiver um e-mail cadastrado, envia a notificação.
      if (os.email_solicitante) {
        enviarEmail([os.email_solicitante], `OS #${os.token} Concluída`, corpoEmail)
          .then(() => console.log(`📧 E-mail de conclusão enviado para ${os.email_solicitante}`))
          .catch(err => console.error('Erro ao enviar e-mail de conclusão:', err));
      }

      // Exibe mensagem de sucesso e redireciona para o painel.
      req.flash('success', 'OS fechada com sucesso.');
      res.redirect('/painel');
    } catch (err) {
      console.error('Erro ao fechar OS:', err);
      req.flash('danger', 'Erro ao fechar OS.');
      res.redirect('/painel');
    }
  },

  // Função para baixar um anexo.
  baixarAnexo: async (req, res) => {
    try {
      // Pega o ID do arquivo dos parâmetros da URL.
      const { arquivoId } = req.params;
      // Busca as informações do arquivo no banco.
      const arquivo = await AnexoModel.findById(arquivoId);

      // Se o arquivo não for encontrado no banco, retorna um erro 404.
      if (!arquivo) return res.status(404).send('Arquivo não encontrado');

      // Monta o caminho completo para o arquivo no servidor.
      const caminho = path.join(__dirname, '..', 'uploads', arquivo.caminho_arquivo);
      // Inicia o download do arquivo, usando o nome original.
      res.download(caminho, arquivo.nome_arquivo);
    } catch (err) {
      console.error('Erro ao baixar anexo:', err);
      res.status(500).send('Erro ao baixar anexo');
    }
  },

  // Função para editar uma OS.
  editarOs: async (req, res) => {
    try {
      // Pega o ID da OS e os novos dados do corpo da requisição.
      const { id } = req.params;
      const { setor, tipo_servico, descricao, status } = req.body;

      // Chama o modelo para atualizar os dados da OS no banco.
      await OrdemModel.editar({ id, setor, tipo_servico, descricao, status });
      req.flash('success', 'OS editada com sucesso.');
      res.redirect('/painel');
    } catch (err) {
      console.error('Erro ao editar OS:', err);
      req.flash('danger', 'Erro ao editar OS.');
      res.redirect('/painel');
    }
  },

  // Função para excluir uma OS.
  excluirOs: async (req, res) => {
    try {
      // Pega o ID da OS a ser excluída.
      const { id } = req.params;
      // Busca todos os anexos associados a essa OS.
      const anexos = await AnexoModel.findByOsId(id);

      // Itera sobre os anexos para excluir os arquivos físicos do servidor.
      for (const anexo of anexos) {
        const caminhoArquivo = path.join(__dirname, '..', 'uploads', anexo.caminho_arquivo);
        if (fs.existsSync(caminhoArquivo)) fs.unlinkSync(caminhoArquivo);
      }

      // Exclui os registros dos anexos do banco de dados.
      await AnexoModel.deleteByOsId(id);
      // Exclui o registro da OS do banco de dados.
      await OrdemModel.excluir(id);

      req.flash('success', 'OS e seus anexos excluídos com sucesso.');
      res.redirect('/painel');
    } catch (err) {
      console.error('Erro ao excluir OS:', err);
      req.flash('danger', 'Erro ao excluir OS.');
      res.redirect('/painel');
    }
  },

  // Função para listar todas as OS (geralmente para uma API).
  listarOs: async (req, res) => {
    try {
      const ordens = await OrdemModel.findByFiltro();
      res.json(ordens);
    } catch (err) {
      console.error('Erro ao listar OSs:', err);
      res.status(500).json({ error: 'Erro ao listar OSs' });
    }
  }
};
