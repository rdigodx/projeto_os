const path = require('path');
const nodemailer = require('nodemailer');
const { logger } = require('./logger');

const emailHost = process.env.EMAIL_HOST;
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailPort = Number(process.env.EMAIL_PORT || 587);
const allowSelfSigned =
  process.env.EMAIL_ALLOW_SELF_SIGNED === 'true' && process.env.NODE_ENV !== 'production';

if (!emailHost || !emailUser || !emailPass) {
  logger.warn('Variaveis de e-mail nao configuradas corretamente (EMAIL_HOST/EMAIL_USER/EMAIL_PASS).');
}

const transporter = nodemailer.createTransport({
  host: emailHost,
  port: emailPort,
  secure: emailPort === 465,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  ...(allowSelfSigned ? { tls: { rejectUnauthorized: false } } : {}),
});

const enviarEmail = async (destinatarios, assunto, corpo, anexos = []) => {
  const lista = Array.isArray(destinatarios) ? destinatarios.filter(Boolean) : [];
  if (lista.length === 0) {
    logger.warn(`Tentativa de envio sem destinatarios. Assunto: ${assunto}`);
    return null;
  }

  try {
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Sistema OS" <${emailUser}>`,
      bcc: lista.join(', '),
      subject: assunto,
      html: corpo,
      attachments: anexos.map((anexo) => ({
        filename: path.basename(anexo),
        path: anexo,
      })),
    });

    logger.info(`E-mail enviado com sucesso. Assunto: ${assunto}`);
    return info;
  } catch (err) {
    logger.error(`Falha ao enviar e-mail. Assunto: ${assunto}`, err);
    throw err;
  }
};

module.exports = { enviarEmail };
