const pool = require('../config/db');

// Busca um usuário pelo nome
exports.findByNome = async (nome) => {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE nome = ?',
    [nome]
  );
  return rows[0];
};

// Cria um novo usuário no banco de dados
exports.create = async ({ nome, email }) => {
  const [result] = await pool.query(
    'INSERT INTO usuarios (nome, email) VALUES (?, ?)',
    [nome, email]
  );
  return { id: result.insertId, nome, email };
};

// Atualiza o email do usuário se ainda não tiver
exports.updateEmailIfEmpty = async (id, email) => {
  const [result] = await pool.query(
    `UPDATE usuarios 
     SET email = ? 
     WHERE id = ? AND (email IS NULL OR email = '')`,
    [email, id]
  );
  return result.affectedRows > 0; // true se atualizou
};

// Busca todos os usuários cadastrados, ordenados por nome
exports.findAll = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios ORDER BY nome'
  );
  return rows;
};
