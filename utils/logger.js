const fs = require('fs');
const path = require('path');

// Função para gravar logs simples de auditoria em arquivo
const logAuditoria = (acao, usuario) => {
  const logDir = path.join(__dirname, '..', 'logs');
  const logPath = path.join(logDir, 'auditoria.log');

  // Garante que o diretório de logs exista
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const data = `${new Date().toISOString()} | ${acao} | Usuário: ${usuario}\n`;
  fs.appendFile(logPath, data, err => {
    if (err) console.error('Erro ao registrar log de auditoria:', err);
  });
};

module.exports = {
  logAuditoria
};