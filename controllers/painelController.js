// Importa o modelo de Ordens de Serviço (funções para consultar o banco)
const OrdemModel = require('../models/ordemModel');
// Importa o modelo de Anexos (para listar arquivos relacionados às OS)
const AnexoModel = require('../models/anexoModel');

// Função que renderiza a página do painel técnico
// Ela reúne várias informações: lista de ordens, contagens por status e gráficos
exports.painel = async (req, res) => {
  // Verifica se o técnico está logado; se não estiver, redireciona para /login
  if (!req.session.tecnico) return res.redirect('/login');

  try {
    // Atualiza ordens que estão como 'Nova' para 'Pendente' quando necessário
    // (por exemplo, para evitar que fiquem eternamente marcadas como 'Nova')
    await OrdemModel.updateStatusNovaParaPendente();
    
    // Pega filtro da query string (ex: /painel?filtro=novas)
    const filtro = req.query.filtro || null;
    // Busca ordens de serviço com o filtro aplicado
    const ordens = await OrdemModel.findByFiltro(filtro);
    
    // Para cada OS, busca seus anexos e adiciona ao objeto (para exibir na tabela)
    for (let os of ordens) {
      os.anexos = await AnexoModel.findByOsId(os.id);
    }

    // Contagens para os indicadores do painel
    const qtd_nova = await OrdemModel.countByStatus('Nova');
    const qtd_pendente = await OrdemModel.countByStatus('Pendente');
    const qtd_concluida = await OrdemModel.countByStatus('Concluída');
    const qtd_fora_prazo = await OrdemModel.countForaPrazo();
    const usuario_top = await OrdemModel.findUsuarioTop();
    const usuarios_top5 = await OrdemModel.findUsuariosTop5();

    // Renderiza a view 'painel' passando todos os dados necessários
    res.render('painel', {
      ordens,
      qtd_nova,
      qtd_pendente,
      qtd_concluida,
      qtd_fora_prazo,
      qtd_total: ordens.length,
      usuario_top,
      usuarios_top5,
      tecnico: req.session.tecnico,
      mes_atual: new Date().getMonth() + 1,
      ano_atual: new Date().getFullYear(),
      messages: req.flash()
    });
  } catch (err) {
    // Passa o erro para o middleware de tratamento de erros do Express
    next(err);
  }
};