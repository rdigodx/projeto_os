const path = require('path');
const fs = require('fs');
const { gerarExcelCompleto } = require('../utils/excel');
const { enviarEmail } = require('../utils/email');
const { logger, logAuditoria } = require('../utils/logger');
const OrdemModel = require('../models/ordemModel');
const AnexoModel = require('../models/anexoModel');

const parsePeriodo = (mesInput, anoInput) => {
  const ano = Number(anoInput);
  const mes = mesInput ? Number(mesInput) : null;
  const anoAtual = new Date().getFullYear();

  if (!Number.isInteger(ano) || ano < 2020 || ano > anoAtual + 1) {
    throw new Error('Ano invalido para geracao de relatorio.');
  }

  if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
    throw new Error('Mes invalido para geracao de relatorio.');
  }

  return { mes, ano };
};

exports.gerar = async (req, res) => {
  let filePath = null;
  const usuarioLog = (req.session.tecnico && req.session.tecnico.usuario) || 'desconhecido';

  try {
    const { mes, ano } = parsePeriodo(req.body.mes, req.body.ano);
    const dados = await OrdemModel.findByPeriodo(mes, ano);

    const osIds = dados.map((os) => os.id);
    const anexos = await AnexoModel.findByOsIds(osIds);
    const anexosPorOs = {};

    for (const anexo of anexos) {
      if (!anexosPorOs[anexo.os_id]) {
        anexosPorOs[anexo.os_id] = [];
      }
      anexosPorOs[anexo.os_id].push(anexo);
    }

    const dir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sufixoMes = mes || 'ano';
    const nomeArquivo = `Relatorio_OS_${sufixoMes}_${ano}.xlsx`;
    filePath = path.join(dir, nomeArquivo);

    await gerarExcelCompleto(dados, anexosPorOs, filePath, sufixoMes, ano);

    const nomeMes = mes
      ? new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long' })
      : null;
    const periodoDescricao = nomeMes ? `${nomeMes} de ${ano}` : `ano de ${ano}`;

    const assunto = `Relatorio de Ordens de Servico - ${periodoDescricao}`;
    const corpo = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #004488;">Relatorio de Ordens de Servico</h2>
        <p>Ola,</p>
        <p>
          Segue em anexo o relatorio de Ordens de Servico referente ao periodo de
          <strong>${periodoDescricao}</strong>.
        </p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <h3>Resumo do Periodo</h3>
        <p>Total de Ordens de Servico no relatorio: <strong>${dados.length}</strong></p>
        <br>
        <p>Atenciosamente,<br>Sistema de OS - MBM Copy</p>
      </div>
    `;

    await enviarEmail(
      [
        process.env.EMAIL_ADMIN_1 || 'depto.ti1@mbmcopy.com.br',
        process.env.EMAIL_ADMIN_2 || 'depto.ti2@mbmcopy.com.br',
        process.env.EMAIL_ADMIN_3 || 'paulo.faraone@mbmcopy.com.br',
      ],
      assunto,
      corpo,
      [filePath]
    );

    logAuditoria('Relatorio gerado e enviado', usuarioLog);
    req.flash('success', 'Relatorio gerado e enviado para os administradores por e-mail.');
    return res.redirect('/painel');
  } catch (err) {
    logger.error('Erro ao gerar relatorio:', err);
    logAuditoria('Erro ao gerar relatorio', usuarioLog);
    req.flash('danger', 'Erro ao gerar o relatorio.');
    return res.redirect('/painel');
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Arquivo temporario ${filePath} excluido com sucesso.`);
      } catch (unlinkErr) {
        logger.error(`Erro ao excluir arquivo temporario ${filePath}:`, unlinkErr);
      }
    }
  }
};
