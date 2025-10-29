const OrdemModel = require('../models/ordemModel');
const AnexoModel = require('../models/anexoModel');

// Função que renderiza a página do painel técnico
exports.painel = async (req, res) => {
  // Verifica se o técnico está logado; se não estiver, redireciona para /login
  if (!req.session.tecnico) return res.redirect('/login');

  try {
    await OrdemModel.updateStatusNovaParaPendente();


    const filtro = req.query.filtro || null;

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