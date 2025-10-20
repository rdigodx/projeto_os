const nodemailer = require('nodemailer');

if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ Atenção: Variáveis de ambiente de e-mail não configuradas corretamente.');
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_PORT == 465, // SSL apenas se for porta 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // evita erro com certificados autoassinados
  }
});

// Função para enviar e-mails
const enviarEmail = async (destinatarios, assunto, corpo, anexos = []) => {
  try {
    // Primeiro, verifica conexão com o servidor SMTP
    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Sistema OS" <${process.env.EMAIL_USER}>`,
      bcc: destinatarios.join(', '), // cópia oculta para todos
      subject: assunto,
      html: corpo,
      attachments: anexos.map(anexo => ({
        filename: anexo.split('/').pop(),
        path: anexo
      }))
    });

    console.log(`📧 E-mail enviado com sucesso para: ${destinatarios.join(', ')}`);
    return info;
  } catch (err) {
    console.error(`❌ Falha ao enviar e-mail (${assunto}) para ${destinatarios.join(', ')}:`, err.message);
    return null; // não trava o sistema
  }
};

module.exports = { enviarEmail };
