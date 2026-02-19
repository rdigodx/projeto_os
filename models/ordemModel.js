const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const SORT_COLUMNS = {
  id: 'os.id',
  data: 'os.data_criacao',
  status: 'os.status',
  prioridade: "FIELD(os.prioridade, 'Crítica', 'Alta', 'Média', 'Baixa')",
  prazo: 'os.prazo_limite',
  solicitante: 'u.nome',
  setor: 'os.setor',
  tipo: 'os.tipo_servico',
  tecnico: 'os.tecnico',
};

const STATUS_FILTERS = {
  nova: { clause: 'os.status = ?', params: ['Nova'] },
  pendente: { clause: 'os.status = ?', params: ['Pendente'] },
  concluida: { clause: 'os.status = ?', params: ['Concluída'] },
  fora_prazo: { clause: 'os.status != ? AND DATEDIFF(NOW(), os.data_criacao) > 7', params: ['Concluída'] },
};

const PRIORIDADE_FILTERS = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

const SLA_ALERTA_HORAS = 2;

const SLA_FILTERS = {
  no_prazo: {
    clause: `os.status != ? AND os.prazo_limite IS NOT NULL AND os.prazo_limite >= DATE_ADD(NOW(), INTERVAL ${SLA_ALERTA_HORAS} HOUR)`,
    params: ['Concluída'],
  },
  vence_hoje: {
    clause: `os.status != ? AND os.prazo_limite IS NOT NULL AND os.prazo_limite >= NOW() AND os.prazo_limite < DATE_ADD(NOW(), INTERVAL ${SLA_ALERTA_HORAS} HOUR)`,
    params: ['Concluída'],
  },
  estourado: {
    clause: 'os.status != ? AND os.prazo_limite IS NOT NULL AND os.prazo_limite < NOW()',
    params: ['Concluída'],
  },
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

// Cria uma nova Ordem de Serviço (OS)
exports.create = async ({
  solicitante_id,
  setor,
  tipo_servico,
  descricao,
  prioridade = 'Média',
  prazo_limite = null,
}, db = pool) => {
  const token = uuidv4().split('-')[0].toUpperCase();
  const [result] = await db.query(
    `INSERT INTO ordens_servico 
      (solicitante_id, setor, tipo_servico, descricao, prioridade, prazo_limite, status, token, data_criacao)
     VALUES (?, ?, ?, ?, ?, ?, 'Nova', ?, NOW())`,
    [solicitante_id, setor, tipo_servico, descricao, prioridade, prazo_limite, token]
  );
  return { id: result.insertId, token };
};

// Busca ordens por mês e ano (para relatórios)
exports.findByPeriodo = async (mes, ano) => {
  let query = `
    SELECT os.id, u.nome AS solicitante, os.setor, os.tipo_servico,
           os.descricao, os.status, os.prioridade, os.prazo_limite, os.resolucao,
           os.data_criacao, os.data_fechamento, os.token
    FROM ordens_servico os
    JOIN usuarios u ON os.solicitante_id = u.id
    WHERE YEAR(os.data_criacao) = ?
  `;

  const params = [ano];

  if (mes) {
    query += ` AND MONTH(os.data_criacao) = ?`;
    params.push(mes);
  }

  query += ` ORDER BY os.data_criacao DESC`;

  const [rows] = await pool.query(query, params);
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

exports.findPaged = async ({
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
  status = '',
  prioridade = '',
  sla = '',
  search = '',
  sort = 'data',
  dir = 'desc',
} = {}) => {
  const safePage = toPositiveInt(page, 1);
  const safePageSize = Math.min(
    PAGE_SIZE_MAX,
    toPositiveInt(pageSize, PAGE_SIZE_DEFAULT)
  );
  const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.data;
  const sortDir = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (safePage - 1) * safePageSize;

  const whereClauses = [];
  const whereParams = [];
  const statusRule = STATUS_FILTERS[status];
  const prioridadeValue = PRIORIDADE_FILTERS[prioridade] || null;
  const slaRule = SLA_FILTERS[sla];

  if (statusRule) {
    whereClauses.push(statusRule.clause);
    whereParams.push(...statusRule.params);
  }

  if (prioridadeValue) {
    whereClauses.push('os.prioridade = ?');
    whereParams.push(prioridadeValue);
  }

  if (slaRule) {
    whereClauses.push(slaRule.clause);
    whereParams.push(...slaRule.params);
  }

  const safeSearch = String(search || '').trim().slice(0, 120);
  if (safeSearch) {
    whereClauses.push(
      `(os.token LIKE ? OR u.nome LIKE ? OR os.setor LIKE ? OR os.tipo_servico LIKE ? OR os.descricao LIKE ? OR os.tecnico LIKE ?)`
    );
    const likeValue = `%${safeSearch}%`;
    whereParams.push(
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue,
      likeValue
    );
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const baseFrom = `
    FROM ordens_servico os
    JOIN usuarios u ON os.solicitante_id = u.id
    ${whereSql}
  `;

  const dataQuery = `
    SELECT
      os.*,
      u.nome AS solicitante_nome,
      TIMESTAMPDIFF(MINUTE, NOW(), os.prazo_limite) AS sla_minutos_restantes,
      CASE
        WHEN os.status = 'Concluída'
             AND os.prazo_limite IS NOT NULL
             AND os.data_fechamento IS NOT NULL
          THEN TIMESTAMPDIFF(MINUTE, os.prazo_limite, os.data_fechamento)
        ELSE NULL
      END AS sla_minutos_conclusao
    ${baseFrom}
    ORDER BY ${sortColumn} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    ${baseFrom}
  `;

  const [rows] = await pool.query(dataQuery, [...whereParams, safePageSize, offset]);
  const [countRows] = await pool.query(countQuery, whereParams);
  const total = Number(countRows[0]?.total || 0);

  return {
    rows,
    total,
    page: safePage,
    pageSize: safePageSize,
  };
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

// Conta TODAS as OS
exports.countAll = async () => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) as count FROM ordens_servico'
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
exports.excluir = async (id, db = pool) => {
  await db.query('DELETE FROM ordens_servico WHERE id = ?', [id]);
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

// Busca uma OS pública pelo token de acompanhamento
exports.findByTokenPublic = async (token) => {
  const [rows] = await pool.query(
    `SELECT
      os.id,
      os.token,
      os.setor,
      os.tipo_servico,
      os.descricao,
      os.status,
      os.resolucao,
      os.data_criacao,
      os.data_fechamento,
      u.nome AS solicitante
    FROM ordens_servico os
    JOIN usuarios u ON os.solicitante_id = u.id
    WHERE os.token = ?
    LIMIT 1`,
    [token]
  );
  return rows[0];
};
