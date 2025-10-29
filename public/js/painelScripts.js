// Executa o script quando o conteúdo do DOM estiver completamente carregado.
document.addEventListener('DOMContentLoaded', () => {
  // ----- Lógica para Fechar Mensagens de Feedback (Alertas) -----
  // Adiciona um evento de clique a todos os botões de fechar nos alertas.
  document.querySelectorAll('.message-close-btn').forEach(button => {
    button.addEventListener('click', function () {

      const messageContainer = this.closest('.message');
      if (messageContainer) {
        messageContainer.style.display = 'none';
      }
    });
  });

  // ----- Lógica para os Modais de "Fechar OS" -----
  // Adiciona um evento de clique a todos os botões de fechar (o 'X').
  document.querySelectorAll('.fechar').forEach(span => {
    span.addEventListener('click', () => {

      const id = span.dataset.id;

      document.getElementById(`modal-${id}`).style.display = 'none';
    });
  });

  // Adiciona um evento de clique na janela para fechar o modal se o usuário clicar fora da caixa de conteúdo.
  window.addEventListener('click', event => {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });

  // ----- Inicialização dos Gráficos (Chart.js) -----
  // Dados para o gráfico de pizza de status (os valores vêm do EJS).
  const labelsStatus = ['Nova', 'Pendente', 'Concluída', 'Fora do Prazo'];
  const dataStatus = [qtdNova, qtdPendente, qtdConcluida, qtdForaPrazo];

  // Cria o gráfico de pizza.
  const ctxStatus = document.getElementById('graficoStatus').getContext('2d');
  new Chart(ctxStatus, {
    type: 'pie',
    data: {
      labels: labelsStatus,
      datasets: [{
        label: 'Total',
        data: dataStatus,

        backgroundColor: [
          getComputedStyle(document.documentElement).getPropertyValue('--cor-sucesso'),      // Nova
          '#ffc107', // Pendente
          getComputedStyle(document.documentElement).getPropertyValue('--cor-secundaria'),   // Concluída
          getComputedStyle(document.documentElement).getPropertyValue('--cor-perigo')        // Fora do Prazo
        ]
      }]
    }
  });

  // Dados para o gráfico de barras dos top 5 usuários.
  const labelsUsuarios = usuariosTop5.map(u => u.nome);
  const dataUsuarios = usuariosTop5.map(u => u.total);

  // Cria o gráfico de barras.
  const ctxUsuarios = document.getElementById('graficoUsuarios').getContext('2d');
  new Chart(ctxUsuarios, {
    type: 'bar',
    data: {
      labels: labelsUsuarios,
      datasets: [{
        label: 'OS abertas',
        data: dataUsuarios,
        backgroundColor: 'rgba(0, 102, 204, 0.7)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // ----- Lógica para o Dark Mode (Modo Escuro) -----
  const body = document.body;
  const toggleButton = document.getElementById('toggle-theme');
  // Garante que o botão de toggle exista na página.
  if (toggleButton) {
    // Ao carregar a página, verifica se o modo escuro estava ativo no localStorage.
    if (localStorage.getItem('dark-mode') === 'true') {
      body.classList.add('dark-mode');
      toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    }

    toggleButton.addEventListener('click', () => {

      body.classList.toggle('dark-mode');
      // Salva o estado atual no localStorage.
      localStorage.setItem('dark-mode', body.classList.contains('dark-mode'));
      // Muda o ícone do botão (sol/lua).
      toggleButton.innerHTML = body.classList.contains('dark-mode') ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }

  // ----- Inicialização da Tabela Interativa (Tabulator) -----
  const tabela = new Tabulator("#tabela-os", {
    data: ordensData, // Carrega os dados das OS, passados pelo EJS.
    layout: "fitDataFill", // Ajusta as colunas para preencher o espaço.
    pagination: "local", // Habilita a paginação do lado do cliente.
    paginationSize: 10, // Define o número padrão de itens por página.
    paginationSizeSelector: [10, 25, 50, 100], // Permite ao usuário escolher quantos itens ver.
    placeholder: "Nenhuma Ordem de Serviço encontrada.", // Mensagem exibida se não houver dados.
    initialSort: [ // Define a ordenação inicial da tabela.
      { column: "id", dir: "desc" }
    ],
    // Definição das colunas da tabela.
    columns: [
      // Cada objeto representa uma coluna.
      { title: "ID", field: "id", width: 80, hozAlign: "center", headerFilter: "input" },
      { title: "Token", field: "token", width: 120, headerFilter: "input" },
      {
        title: "Status",
        field: "status",
        hozAlign: "center",
        headerFilter: "list", // A propriedade "select" foi depreciada. "list" é a correta.
        headerFilterParams: { values: true }, // Popula o filtro com os valores existentes na coluna.
        formatter: function (cell) { // 'formatter' personaliza como o valor da célula é exibido.
          const status = cell.getValue();
          // Retorna um HTML customizado para o status.
          return `<span class="status-badge status-${status.toLowerCase()}">${status}</span>`;
        }
      },
      { title: "Solicitante", field: "solicitante_nome", minWidth: 150, headerFilter: "input" },
      { title: "Setor", field: "setor", headerFilter: "input" },
      { title: "Tipo Serviço", field: "tipo_servico", minWidth: 150 },
      { title: "Descrição", field: "descricao", minWidth: 200, tooltip: true },
      {
        title: "Data Criação",
        field: "data_criacao",
        hozAlign: "center",
        formatter: function (cell) {
          const data = cell.getValue();
          return data ? new Date(data).toLocaleString('pt-BR') : '';
        }
      },
      { title: "Resolução", field: "resolucao", minWidth: 200, tooltip: true },
      { title: "Técnico", field: "tecnico" },
      {
        title: "Anexos",
        field: "anexos",
        headerSort: false, // Desabilita a ordenação para esta coluna.
        formatter: function (cell) {
          const anexos = cell.getValue();
          if (anexos && anexos.length > 0) {
            let links = '<ul>';
            anexos.forEach(anexo => {
              links += `<li><a href="/os/baixar-anexo/${anexo.id}" target="_blank"><i class="fas fa-paperclip"></i> ${anexo.nome_arquivo}</a></li>`;
            });
            links += '</ul>';
            return links;
          }
          return "<em>Sem anexos</em>";
        }
      },
      {
        title: "Ações",
        hozAlign: "center",
        headerSort: false,
        formatter: function (cell) { // Formata a célula de ações.
          const os = cell.getRow().getData();
          // Se a OS não estiver 'Concluída', mostra o botão para fechar.
          if (os.status !== 'Concluída') {
            const button = document.createElement('button');
            button.innerHTML = '<i class="fas fa-check"></i> Fechar OS'; // Usar innerHTML é aceitável aqui, mas textContent é mais seguro se não precisar de HTML.
            button.classList.add('btn', 'btn-success');

            // Usar addEventListener é uma prática mais moderna e robusta que 'onclick'.
            button.addEventListener('click', (e) => {
              e.stopPropagation(); // Impede que eventos de clique na linha da tabela sejam disparados.
              document.getElementById(`modal-${os.id}`).style.display = 'flex'; // Alterado para 'flex' para centralizar corretamente
            });
            return button;
          }
          return '<strong><i class="fas fa-check-circle"></i> Finalizada</strong>';
        }
      },
    ],
    locale: "pt-br", // Define o idioma da tabela para português do Brasil.
    // Objeto de tradução para os textos da interface do Tabulator.
    langs: {
      "pt-br": {
        "headerFilters": {
          "default": "Filtrar...", // Texto padrão para os campos de filtro.
        },
        "pagination": {
          "page_size": "Itens por página", // Rótulo para o seletor de tamanho da página.
          "page_title": "Mostrar página",
          "first": "Primeira",
          "first_title": "Primeira Página",
          "last": "Última",
          "last_title": "Última Página",
          "prev": "Anterior",
          "prev_title": "Página Anterior",
          "next": "Próxima",
          "next_title": "Próxima Página",
        }
      }
    },
  });
});
