
const pool = require('../config/db');

// Insere um registro de anexo ligado a uma OS
exports.create = async ({ os_id, nome_arquivo, caminho_arquivo }, db = pool) => {
  const [result] = await db.query(
    'INSERT INTO anexos_os (os_id, nome_arquivo, caminho_arquivo) VALUES (?, ?, ?)',
    [os_id, nome_arquivo, caminho_arquivo]
  );
  return { id: result.insertId, nome_arquivo, caminho_arquivo };
};

// Busca anexos por id da OS (usado para listar arquivos relacionados)
exports.findByOsId = async (os_id, db = pool) => {
  const [rows] = await db.query(
    'SELECT * FROM anexos_os WHERE os_id = ? ORDER BY id DESC',
    [os_id]
  );
  return rows;
};

// Busca anexos por vários IDs de OS em uma consulta
exports.findByOsIds = async (osIds, db = pool) => {
  if (!Array.isArray(osIds) || osIds.length === 0) {
    return [];
  }

  const placeholders = osIds.map(() => '?').join(', ');
  const [rows] = await db.query(
    `SELECT * FROM anexos_os WHERE os_id IN (${placeholders}) ORDER BY id DESC`,
    osIds
  );
  return rows;
};

// Busca um anexo pelo próprio id do anexo
exports.findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM anexos_os WHERE id = ?', [id]);
  return rows[0];
};

// Exclui todos os anexos relacionados a uma OS
exports.deleteByOsId = async (os_id, db = pool) => {
  await db.query('DELETE FROM anexos_os WHERE os_id = ?', [os_id]);
};
