const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// Cria uma nova Ordem de Serviço (OS)
exports.create = async ({ solicitante_id, setor, tipo_servico, descricao }) => {
  const token = uuidv4().split('-')[0].toUpperCase();
  const [result] = await pool.query(
    `INSERT INTO ordens_servico 
      (solicitante_id, setor, tipo_servico, descricao, status, token, data_criacao)
     VALUES (?, ?, ?, ?, 'Nova', ?, NOW())`,
    [solicitante_id, setor, tipo_servico, descricao, token]
  );
  return { id: result.insertId, token };
};

// Busca ordens por mês e ano (para relatórios)
exports.findByPeriodo = async (mes, ano) => {
  const [rows] = await pool.query(
    `SELECT os.id, u.nome AS solicitante, os.setor, os.tipo_servico,
            os.descricao, os.status, os.tecnico, os.resolucao,
            os.data_criacao, os.data_fechamento, os.token
     FROM ordens_servico os
     JOIN usuarios u ON os.solicitante_id = u.id
     WHERE MONTH(os.data_criacao) = ? AND YEAR(os.data_criacao) = ?
     ORDER BY os.data_criacao DESC`,
    [mes, ano]
  );
  return rows;
};

// Busca ordens aplicando filtro
exports.findByFiltro = async (filtro = null) => {
  let query = `
    SELECT os.*, u.nome AS solicitante_nome
    FROM ordens_servico os
    JOIN usuarios u ON os.solicitante_id = u.id
  `;
  let params = [];

  if (filtro) {
    switch (filtro) {
      case 'novas':
        query += ' WHERE os.status = ?';
        params.push('Nova');
        break;
      case 'pendentes':
        query += ' WHERE os.status = ?';
        params.push('Pendente');
        break;
      case 'concluidas':
        query += ' WHERE os.status = ?';
        params.push('Concluída');
        break;
      case 'fora_prazo':
        query += ' WHERE os.status != "Concluída" AND DATEDIFF(NOW(), os.data_criacao) > 7';
        break;
    }
  }

  query += ' ORDER BY os.data_criacao DESC';
  const [rows] = await pool.query(query, params);
  return rows;
};

// Atualiza status de uma OS
exports.updateStatus = async (id, status, tecnico = null, resolucao = null) => {
  if (status === 'Concluída') {
    await pool.query(
      `UPDATE ordens_servico 
       SET status = ?, tecnico = ?, resolucao = ?, data_fechamento = NOW() 
       WHERE id = ?`,
      [status, tecnico, resolucao, id]
    );
  } else {
    await pool.query(
      `UPDATE ordens_servico 
       SET status = ?, tecnico = ? 
       WHERE id = ?`,
      [status, tecnico, id]
    );
  }
};

// Atualiza OS antigas de 'Nova' para 'Pendente'
exports.updateStatusNovaParaPendente = async () => {
  await pool.query(
    "UPDATE ordens_servico SET status = 'Pendente' WHERE status = 'Nova' AND DATEDIFF(NOW(), data_criacao) > 0"
  );
};

// Conta OS por status
exports.countByStatus = async (status) => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM ordens_servico WHERE status = ?',
    [status]
  );
  return rows[0].count;
};

// Conta OS fora do prazo
exports.countForaPrazo = async () => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count 
     FROM ordens_servico 
     WHERE status != 'Concluída' 
       AND DATEDIFF(NOW(), data_criacao) > 7`
  );
  return rows[0].count;
};

// Usuário que mais abriu OS
exports.findUsuarioTop = async () => {
  const [rows] = await pool.query(
    `SELECT u.nome, COUNT(os.id) as total
     FROM ordens_servico os
     JOIN usuarios u ON os.solicitante_id = u.id
     GROUP BY u.id
     ORDER BY total DESC
     LIMIT 1`
  );
  return rows[0];
};

// Top 5 usuários que mais abriram OS
exports.findUsuariosTop5 = async () => {
  const [rows] = await pool.query(
    `SELECT u.nome, COUNT(os.id) as total
     FROM ordens_servico os
     JOIN usuarios u ON os.solicitante_id = u.id
     GROUP BY u.id
     ORDER BY total DESC
     LIMIT 5`
  );
  return rows;
};

// Fecha uma OS
exports.fechar = async ({ id, resolucao, tecnico }) => {
  await pool.query(
    `UPDATE ordens_servico 
     SET status = 'Concluída', resolucao = ?, tecnico = ?, data_fechamento = NOW()
     WHERE id = ?`,
    [resolucao, tecnico, id]
  );
};

// Edita OS
exports.editar = async ({ id, setor, tipo_servico, descricao, status }) => {
  await pool.query(
    `UPDATE ordens_servico 
     SET setor = ?, tipo_servico = ?, descricao = ?, status = ?
     WHERE id = ?`,
    [setor, tipo_servico, descricao, status, id]
  );
};

// Exclui OS
exports.excluir = async (id) => {
  await pool.query('DELETE FROM ordens_servico WHERE id = ?', [id]);
};

// Busca OS por id
exports.findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT os.*, u.nome AS solicitante_nome, u.email AS email_solicitante
     FROM ordens_servico os
     JOIN usuarios u ON os.solicitante_id = u.id
     WHERE os.id = ?`,
    [id]
  );
  return rows[0];
};
