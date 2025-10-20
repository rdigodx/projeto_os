// Importa o módulo mysql2/promise para trabalhar com conexões MySQL de forma assíncrona
const mysql = require("mysql2/promise");

// Cria um pool de conexões com as configurações do banco de dados
const pool = mysql.createPool({
  host: process.env.DB_HOST, // Endereço do servidor MySQL
  user: process.env.DB_USER, // Usuário do banco de dados
  password: process.env.DB_PASS, // Senha do banco de dados
  database: process.env.DB_NAME, // Nome do banco de dados
  waitForConnections: true, // Aguarda conexões disponíveis no pool
  connectionLimit: 10, // Limite máximo de conexões simultâneas
  queueLimit: 0, // Sem limite para filas de espera
});

// Exporta o pool para ser utilizado em outros módulos
module.exports = pool;
