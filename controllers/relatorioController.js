// Importa o módulo 'path' para lidar com caminhos de arquivos.
const path = require('path');
// Importa o módulo 'fs' (File System) para interagir com o sistema de arquivos.
const fs = require('fs');
// Importa a função utilitária que gera o arquivo Excel.
const { gerarExcelCompleto } = require('../utils/excel');
// Importa a função para enviar e-mails.
const { enviarEmail } = require('../utils/email');
// Importa a função de log de auditoria.
const { logAuditoria } = require('../utils/logger');
// Importa os modelos de dados para buscar informações no banco.
const OrdemModel = require('../models/ordemModel');
const AnexoModel = require('../models/anexoModel');

// Função assíncrona que gera o relatório de OS para um mês e ano específicos.
exports.gerar = async (req, res) => {
  // Extrai 'mes' e 'ano' do corpo da requisição (enviados pelo formulário).
  const { mes, ano } = req.body;
  // Identifica o usuário que solicitou o relatório a partir da sessão.
  const usuario = req.session.tecnico || 'desconhecido';
  
  try {
    // Busca no banco de dados todas as ordens de serviço para o mês e ano especificados.
    const dados = await OrdemModel.findByPeriodo(mes, ano);

    // Cria um objeto para armazenar os anexos de cada OS.
    const anexosPorOs = {};
    // Itera sobre cada OS encontrada para buscar seus respectivos anexos.
    for (let os of dados) {
      anexosPorOs[os.id] = await AnexoModel.findByOsId(os.id);
    }

    // Define o diretório onde os relatórios serão salvos.
    const dir = path.join(__dirname, '..', 'reports');
    // Se o diretório não existir, ele é criado.
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Define o nome do arquivo do relatório e seu caminho completo.
    const nomeArquivo = `Relatorio_OS_${mes}_${ano}.xlsx`;
    const filePath = path.join(dir, nomeArquivo);

    // Chama a função utilitária para gerar o arquivo Excel com os dados das OS e seus anexos.
    await gerarExcelCompleto(dados, anexosPorOs, filePath, mes, ano);

    // Obtém o nome do mês por extenso para usar no e-mail.
    const nomeMes = new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' });

    // Define o assunto e o corpo do e-mail de notificação.
    const assunto = `Relatório de Ordens de Serviço - ${nomeMes} de ${ano}`;
    const corpo = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #004488;">Relatório de Ordens de Serviço</h2>
        <p>Olá,</p>
        <p>
          Segue em anexo o relatório de Ordens de Serviço referente ao período de
          <strong>${nomeMes} de ${ano}</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <h3>Resumo do Período</h3>
        <p>Total de Ordens de Serviço no relatório: <strong>${dados.length}</strong></p>
        <br>
        <p>Atenciosamente,<br>Sistema de OS - MBM Copy</p>
      </div>
    `;
    
    // Envia o e-mail para os administradores, anexando o arquivo Excel gerado.
    // Os e-mails dos administradores são lidos das variáveis de ambiente.
    await enviarEmail(
      [
        process.env.EMAIL_ADMIN_1 || 'depto.ti1@mbmcopy.com.br',
        process.env.EMAIL_ADMIN_2 || 'depto.ti2@mbmcopy.com.br'
      ],
      assunto,
      corpo,
      [filePath] // Array de anexos.
    );

    // Registra a ação no log de auditoria.
    logAuditoria('Relatório gerado e enviado', usuario.usuario);
    // Define uma mensagem de sucesso para ser exibida na próxima página.
    req.flash('success', 'Relatório gerado e enviado para os administradores por e-mail.');
    // Redireciona o usuário de volta para o painel.
    res.redirect('/painel');
  } catch (err) {
    // Em caso de erro, registra no console e no log de auditoria.
    console.error('Erro ao gerar relatório:', err);
    logAuditoria('Erro ao gerar relatório', usuario.usuario);
    req.flash('danger', 'Erro ao gerar o relatório.');
    res.redirect('/painel');
  }
};