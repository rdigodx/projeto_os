// Biblioteca para gerar arquivos Excel
const ExcelJS = require('exceljs');

// Gera um arquivo Excel com os dados das OS
// Parâmetros:
// - dados: array de objetos com as OS
// - anexosPorOs: objeto mapeando os.id -> array de anexos
// - filePath: caminho completo do arquivo onde salvar
// - mes, ano: usados para nome da planilha
// Exemplo de uso: await gerarExcelCompleto(dados, anexosPorOs, './reports/rel.xlsx', 9, 2025)
exports.gerarExcelCompleto = async (dados, anexosPorOs, filePath, mes, ano) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`OS ${mes}-${ano}`);

  // Define colunas e cabeçalhos do Excel
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Token', key: 'token', width: 15 },
    { header: 'Solicitante', key: 'solicitante', width: 20 },
    { header: 'Setor', key: 'setor', width: 15 },
    { header: 'Tipo Serviço', key: 'tipo_servico', width: 20 },
    { header: 'Descrição', key: 'descricao', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Técnico', key: 'tecnico', width: 15 },
    { header: 'Resolução', key: 'resolucao', width: 25 },
    { header: 'Data Criação', key: 'data_criacao', width: 20 },
    { header: 'Data Fechamento', key: 'data_fechamento', width: 20 },
    { header: 'Anexos', key: 'anexos', width: 20 }
  ];

  // Preenche as linhas com os dados
  dados.forEach(os => {
    const anexos = anexosPorOs[os.id] || [];
    worksheet.addRow({
      ...os,
      anexos: anexos.map(a => a.nome_arquivo).join(', '),
      data_criacao: new Date(os.data_criacao).toLocaleString('pt-BR'),
      data_fechamento: os.data_fechamento ? new Date(os.data_fechamento).toLocaleString('pt-BR') : ''
    });
  });

  // Salva o arquivo no disco e retorna o caminho
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};