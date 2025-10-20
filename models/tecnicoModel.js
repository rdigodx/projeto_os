const pool = require('../config/db');

// Busca um técnico pelo nome de usuário
exports.findByUsuario = async (usuario) => {
  const [rows] = await pool.query('SELECT * FROM tecnicos WHERE usuario = ?', [usuario]);
  return rows[0];
};

// Busca um técnico pelo e-mail
exports.findByEmail = async (email) => {
  const [rows] = await pool.query('SELECT * FROM tecnicos WHERE email = ?', [email]);
  return rows[0];
};

// Cria um novo técnico (usado para cadastrar novos usuários técnicos)
exports.create = async ({ nome, email, usuario, senhaHash }) => {
  const [result] = await pool.query(
    'INSERT INTO tecnicos (nome, email, usuario, senha) VALUES (?, ?, ?, ?)',
    [nome, email, usuario, senhaHash]
  );
  return { id: result.insertId, nome, email, usuario };
};

// Atualiza a senha (armazenada como hash)
exports.updateSenha = async (id, novaHash) => {
  await pool.query('UPDATE tecnicos SET senha = ? WHERE id = ?', [novaHash, id]);
};

// Busca os e-mails de todos os técnicos
exports.findAllEmails = async () => {
  const [rows] = await pool.query('SELECT email FROM tecnicos WHERE email IS NOT NULL AND email != ""');
  // Retorna um array apenas com os e-mails. Ex: ['tecnico1@email.com', 'tecnico2@email.com']
  return rows.map(row => row.email);
};