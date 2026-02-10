document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     ⚙️ UTILIDADES
  ===================================================== */
  const body = document.body;
  const isDark = body.classList.contains("dark-mode");

  const cssVar = v =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const cores = {
    nova: cssVar("--cor-sucesso"),
    pendente: "#ffc107",
    concluida: cssVar("--cor-secundaria"),
    fora_prazo: cssVar("--cor-perigo"),
    texto: isDark ? "#e5e5e5" : "#333",
    grid: isDark ? "#444" : "#ddd"
  };

  /* =====================================================
     ❌ FECHAR ALERTAS
  ===================================================== */
  document.querySelectorAll(".message-close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".message")?.remove();
    });
  });

  /* =====================================================
     📌 MODAIS
  ===================================================== */
  document.querySelectorAll(".fechar").forEach(span => {
    span.addEventListener("click", () => {
      document.getElementById(`modal-${span.dataset.id}`)?.style.setProperty("display", "none");
    });
  });

  window.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) {
      e.target.style.display = "none";
    }
  });

  /* =====================================================
     📊 GRÁFICO – STATUS
  ===================================================== */
  const ctxStatus = document.getElementById("graficoStatus");
  if (ctxStatus) {
    new Chart(ctxStatus, {
      type: "doughnut",
      data: {
        labels: ["Nova", "Pendente", "Concluída", "Fora do Prazo"],
        datasets: [{
          data: [qtdNova, qtdPendente, qtdConcluida, qtdForaPrazo],
          backgroundColor: [
            cores.nova,
            cores.pendente,
            cores.concluida,
            cores.fora_prazo
          ],
          borderWidth: 0
        }]
      },
      options: {
        cutout: "70%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: cores.texto }
          }
        }
      }
    });
  }

  /* =====================================================
     📊 GRÁFICO – USUÁRIOS
  ===================================================== */
  const ctxUsuarios = document.getElementById("graficoUsuarios");
  if (ctxUsuarios) {
    new Chart(ctxUsuarios, {
      type: "bar",
      data: {
        labels: usuariosTop5.map(u => u.nome),
        datasets: [{
          label: "OS abertas",
          data: usuariosTop5.map(u => u.total),
          backgroundColor: cores.concluida,
          borderRadius: 6
        }]
      },
      options: {
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: cores.texto },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: cores.texto },
            grid: { color: cores.grid }
          }
        }
      }
    });
  }

  /* =====================================================
     🧩 TABULATOR – PROFISSIONAL
  ===================================================== */
  if (document.getElementById("tabela-os")) {

    new Tabulator("#tabela-os", {
      data: ordensData,
      layout: "fitColumns",
      responsiveLayout: "collapse",
      pagination: "local",
      paginationSize: 10,
      paginationSizeSelector: [10, 25, 50, 100],
      initialSort: [{ column: "id", dir: "desc" }],
      placeholder: "Nenhuma Ordem de Serviço encontrada",

      columns: [
        { title: "ID", field: "id", width: 70, hozAlign: "center", headerFilter: "input" },
        { title: "Token", field: "token", headerFilter: "input" },
        {
          title: "Status",
          field: "status",
          hozAlign: "center",
          headerFilter: "list",
          headerFilterParams: { values: true },
          formatter: cell => {
            const status = cell.getValue()
              .toLowerCase()
              .replace(" ", "_");

            return `<span class="status-badge status-${status}">
              ${cell.getValue()}
            </span>`;
          }
        },
        { title: "Solicitante", field: "solicitante_nome", headerFilter: "input" },
        { title: "Setor", field: "setor", headerFilter: "input" },
        { title: "Tipo Serviço", field: "tipo_servico" },
        { title: "Descrição", field: "descricao", tooltip: true },
        {
          title: "Data",
          field: "data_criacao",
          hozAlign: "center",
          formatter: c =>
            c.getValue() ? new Date(c.getValue()).toLocaleString("pt-BR") : ""
        },
        { title: "Técnico", field: "tecnico" },
        {
          title: "Ações",
          hozAlign: "center",
          headerSort: false,
          formatter: cell => {
            const os = cell.getRow().getData();
            if (os.status !== "Concluída") {
              return `<button class="btn btn-success btn-sm" data-id="${os.id}">
                <i class="fas fa-check"></i>
              </button>`;
            }
            return `<i class="fas fa-check-circle"></i>`;
          },
          cellClick: (e, cell) => {
            const id = cell.getRow().getData().id;
            document.getElementById(`modal-${id}`).style.display = "flex";
          }
        }
      ],

      locale: "pt-br",
      langs: {
        "pt-br": {
          pagination: {
            page_size: "Itens por página",
            first: "Primeira",
            last: "Última",
            prev: "Anterior",
            next: "Próxima"
          }
        }
      }
    });
  }

});
