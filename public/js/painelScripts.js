document.addEventListener("DOMContentLoaded", () => {

  /* =====================================================
     ⚙️ UTILIDADES
  ===================================================== */
  const body = document.body;
  const isDark = body.classList.contains("dark-mode");

  const cssVar = v =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const normalizeKey = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const getStatusClass = (statusValue) => {
    const normalized = normalizeKey(statusValue);

    if (!normalized) {
      return "desconhecido";
    }

    if (normalized === "fora do prazo") {
      return "fora_prazo";
    }

    return normalized.replace(/\s+/g, "_");
  };

  const PRIORIDADE_LABELS = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    critica: "Crítica",
  };
  const SLA_ALERTA_MINUTOS = 2 * 60;

  const getPrioridadeClass = (prioridadeValue) => {
    const normalized = normalizeKey(prioridadeValue);

    if (normalized in PRIORIDADE_LABELS) {
      return normalized;
    }

    return "desconhecida";
  };

  const renderPrioridadeHtml = (value) => {
    const prioridadeClass = getPrioridadeClass(value);
    const prioridadeLabel = PRIORIDADE_LABELS[prioridadeClass] || String(value || "Sem prioridade");
    return `<span class="prioridade-badge prioridade-${prioridadeClass}">
      ${escapeHtml(prioridadeLabel)}
    </span>`;
  };

  const formatMinutes = (minutesValue) => {
    const total = Math.max(0, Math.floor(Math.abs(Number(minutesValue) || 0)));
    const dias = Math.floor(total / (24 * 60));
    const horas = Math.floor((total % (24 * 60)) / 60);
    const minutos = total % 60;
    const partes = [];

    if (dias > 0) {
      partes.push(`${dias}d`);
    }
    if (horas > 0 || dias > 0) {
      partes.push(`${horas}h`);
    }
    partes.push(`${minutos}m`);

    return partes.join(" ");
  };

  const renderSlaHtml = (os) => {
    const statusClass = getStatusClass(os.status);
    const isConcluida = statusClass === "concluida" || statusClass === "concluido";
    const prazoLimite = os.prazo_limite ? new Date(os.prazo_limite) : null;
    const prazoValido = prazoLimite instanceof Date && !Number.isNaN(prazoLimite.getTime());

    if (!prazoValido) {
      return `<span class="sla-badge sla-sem-prazo">Sem prazo</span>`;
    }

    const conclusaoDelta = Number(os.sla_minutos_conclusao);
    if (isConcluida) {
      if (!Number.isFinite(conclusaoDelta)) {
        return `<span class="sla-badge sla-concluido">Concluída</span>`;
      }

      if (conclusaoDelta <= 0) {
        const antecedencia = formatMinutes(conclusaoDelta);
        return `<span class="sla-badge sla-concluido-ok">Concluída no prazo (${antecedencia} antes)</span>`;
      }

      return `<span class="sla-badge sla-estourado">Concluída com atraso (${formatMinutes(conclusaoDelta)})</span>`;
    }

    const minutosRestantesDb = Number(os.sla_minutos_restantes);
    const minutosRestantes = Number.isFinite(minutosRestantesDb)
      ? minutosRestantesDb
      : Math.floor((prazoLimite.getTime() - Date.now()) / (60 * 1000));

    if (minutosRestantes < 0) {
      return `<span class="sla-badge sla-estourado">Estourado ha ${formatMinutes(minutosRestantes)}</span>`;
    }

    if (minutosRestantes <= SLA_ALERTA_MINUTOS) {
      return `<span class="sla-badge sla-alerta">Vence em ${formatMinutes(minutosRestantes)}</span>`;
    }

    return `<span class="sla-badge sla-ok">${formatMinutes(minutosRestantes)} restantes</span>`;
  };

  const normalizeAnexos = (value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        return [];
      }
    }

    return [];
  };

  const renderAnexosHtml = (value) => {
    const anexosValidos = normalizeAnexos(value).filter((anexo) => {
      const id = Number(anexo && anexo.id);
      return Number.isInteger(id) && id > 0;
    });

    if (anexosValidos.length === 0) {
      return "<em>Sem anexos</em>";
    }

    let links = "<ul>";
    anexosValidos.forEach((anexo) => {
      const id = Number(anexo.id);
      const nomeArquivo = escapeHtml(anexo.nome_arquivo || "Arquivo");
      links += `<li><a href="/os/baixar-anexo/${id}" target="_blank" rel="noopener noreferrer"><i class="fas fa-paperclip"></i> ${nomeArquivo}</a></li>`;
    });
    links += "</ul>";
    return links;
  };

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
  const clearInlineFeedback = (slot) => {
    if (slot) {
      slot.innerHTML = "";
    }
  };

  const renderInlineFeedback = (slot, text, type = "danger") => {
    if (!slot) return;

    slot.innerHTML = `
      <div class="messages-container">
        <div class="message ${type}" role="alert">
          <span class="message-marker" aria-hidden="true"></span>
          <div class="message-text">${escapeHtml(text)}</div>
          <button
            type="button"
            class="message-close-btn"
            aria-label="Fechar mensagem"
            onclick="this.closest('.message').remove();"
          >&times;</button>
        </div>
      </div>
    `;
  };

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

  document.querySelectorAll('form[action^="/os/fechar/"]').forEach((form) => {
    const textarea = form.querySelector('textarea[name="resolucao"]');
    const feedbackSlot = form.querySelector('.modal-form-feedback');

    if (!textarea) return;

    textarea.addEventListener("input", () => {
      if (String(textarea.value || "").trim()) {
        textarea.classList.remove("input-error");
        clearInlineFeedback(feedbackSlot);
      }
    });

    form.addEventListener("submit", (event) => {
      const resolucao = String(textarea.value || "").trim();
      if (!resolucao) {
        event.preventDefault();
        textarea.classList.add("input-error");
        renderInlineFeedback(feedbackSlot, "Informe a resolucao para concluir a OS.");
        textarea.focus();
        return;
      }

      textarea.classList.remove("input-error");
      clearInlineFeedback(feedbackSlot);
    });
  });

  /* =====================================================
     📊 GRÁFICO – STATUS
  ===================================================== */
  const ctxStatus = document.getElementById("graficoStatus");
  if (ctxStatus && typeof Chart !== "undefined") {
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
  } else if (ctxStatus) {
    console.error("Chart.js nao foi carregado. Grafico de status indisponivel.");
  }

  /* =====================================================
     📊 GRÁFICO – USUÁRIOS
  ===================================================== */
  const ctxUsuarios = document.getElementById("graficoUsuarios");
  if (ctxUsuarios && typeof Chart !== "undefined") {
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
  } else if (ctxUsuarios) {
    console.error("Chart.js nao foi carregado. Grafico de usuarios indisponivel.");
  }

  /* =====================================================
     🧩 TABULATOR – PROFISSIONAL
  ===================================================== */
  const tabelaEl = document.getElementById("tabela-os");
  if (tabelaEl) {
    if (typeof Tabulator === "undefined") {
      console.error("Tabulator nao foi carregado. Renderizando tabela fallback.");
      const linhas = (ordensData || [])
        .map((os) => {
          const id = escapeHtml(os.id);
          const token = escapeHtml(os.token);
          const status = escapeHtml(os.status);
          const prioridade = renderPrioridadeHtml(os.prioridade);
          const sla = renderSlaHtml(os);
          const solicitante = escapeHtml(os.solicitante_nome);
          const setor = escapeHtml(os.setor);
          const tipo = escapeHtml(os.tipo_servico);
          const anexosHtml = renderAnexosHtml(os.anexos);
          const data = os.data_criacao ? new Date(os.data_criacao).toLocaleString("pt-BR") : "";
          return `<tr>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${id}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${token}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${status}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${prioridade}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${sla}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${solicitante}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${setor}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${tipo}</td>
            <td style="border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">${anexosHtml}</td>
            <td style="border-bottom:1px solid #ddd; padding:8px;">${data}</td>
          </tr>`;
        })
        .join("");

      tabelaEl.innerHTML = `
        <div class="alert alert-warning" style="margin-bottom: 1rem;">
          Tabela interativa indisponivel (falha ao carregar biblioteca). Exibindo modo simples.
        </div>
        <div style="overflow:auto;">
          <table style="width:100%; border-collapse:collapse; border:1px solid #ddd;">
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">ID</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Token</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Status</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Prioridade</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">SLA</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Solicitante</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Setor</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Tipo</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; border-right:1px solid #ddd; padding:8px;">Anexos</th>
                <th style="text-align:left; border-bottom:1px solid #ddd; padding:8px;">Data</th>
              </tr>
            </thead>
            <tbody>
              ${linhas || `<tr><td colspan="10" style="padding:8px;">Nenhuma Ordem de Servico encontrada.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    new Tabulator("#tabela-os", {
      data: ordensData,
      layout: "fitColumns",
      responsiveLayout: "collapse",
      placeholder: "Nenhuma Ordem de Serviço encontrada",

      columns: [
        { title: "ID", field: "id", width: 70, hozAlign: "center", headerSort: false },
        { title: "Token", field: "token", headerSort: false },
        {
          title: "Status",
          field: "status",
          hozAlign: "center",
          headerSort: false,
          formatter: cell => {
            const statusValue = String(cell.getValue() || "");
            const status = getStatusClass(statusValue);

            return `<span class="status-badge status-${status}">
              ${escapeHtml(statusValue)}
            </span>`;
          }
        },
        {
          title: "Prioridade",
          field: "prioridade",
          hozAlign: "center",
          headerSort: false,
          formatter: (cell) => renderPrioridadeHtml(cell.getValue())
        },
        {
          title: "SLA",
          field: "sla_minutos_restantes",
          headerSort: false,
          formatter: (cell) => renderSlaHtml(cell.getRow().getData())
        },
        { title: "Solicitante", field: "solicitante_nome", headerSort: false },
        { title: "Setor", field: "setor", headerSort: false },
        { title: "Tipo Serviço", field: "tipo_servico", headerSort: false },
        { title: "Descrição", field: "descricao", tooltip: true, headerSort: false },
        {
          title: "Data",
          field: "data_criacao",
          hozAlign: "center",
          headerSort: false,
          formatter: c =>
            c.getValue() ? new Date(c.getValue()).toLocaleString("pt-BR") : ""
        },
        { title: "Técnico", field: "tecnico", headerSort: false },
        {
          title: "Anexos",
          field: "anexos",
          headerSort: false,
          formatter: (cell) => renderAnexosHtml(cell.getValue())
        },
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
            const os = cell.getRow().getData();
            if (os.status === "Concluída") {
              return;
            }

            const id = os.id;
            const modal = document.getElementById(`modal-${id}`);
            if (modal) {
              modal.style.display = "flex";
            }
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
