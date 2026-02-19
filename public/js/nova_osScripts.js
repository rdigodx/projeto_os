document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action="/os/criar"]');
  const formFeedbackSlot = document.getElementById('clientFormFeedback');
  const nomeInput = document.querySelector('select[name="nome"]');
  const setorInput = document.querySelector('select[name="setor"]');
  const tipoServicoInput = document.querySelector('input[name="tipo_servico"]');
  const prioridadeInput = document.querySelector('select[name="prioridade"]');
  const descricaoInput = document.querySelector('textarea[name="descricao"]');
  const fileInput = document.querySelector('input[name="anexos"]');
  const charCounter = document.querySelector('.char-counter');
  const maxChars = 500;

  if (!form) {
    return;
  }

  const camposObrigatorios = [nomeInput, setorInput, tipoServicoInput, prioridadeInput, descricaoInput].filter(Boolean);

  const clearFormFeedback = () => {
    if (formFeedbackSlot) {
      formFeedbackSlot.innerHTML = '';
    }
  };

  const renderFormFeedback = (text, type = 'danger') => {
    if (!formFeedbackSlot) return;

    formFeedbackSlot.innerHTML = `
      <div class="messages-container">
        <div class="message ${type}" role="alert">
          <span class="message-marker" aria-hidden="true"></span>
          <div class="message-text">${text}</div>
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

  const validarCamposObrigatorios = () => {
    let invalido = false;

    for (const campo of camposObrigatorios) {
      const valor = String(campo.value || '').trim();
      if (!valor) {
        campo.classList.add('input-error');
        invalido = true;
      } else {
        campo.classList.remove('input-error');
      }
    }

    return !invalido;
  };

  for (const campo of camposObrigatorios) {
    const evento = campo.tagName === 'SELECT' ? 'change' : 'input';
    campo.addEventListener(evento, () => {
      const valor = String(campo.value || '').trim();
      if (valor) {
        campo.classList.remove('input-error');
        const aindaInvalido = camposObrigatorios.some((item) => !String(item.value || '').trim());
        if (!aindaInvalido) {
          clearFormFeedback();
        }
      }
    });
  }

  form.addEventListener('submit', (event) => {
    if (!validarCamposObrigatorios()) {
      event.preventDefault();
      renderFormFeedback('Preencha todos os campos obrigatorios destacados.');
      const primeiroInvalido = camposObrigatorios.find((campo) => campo.classList.contains('input-error'));
      if (primeiroInvalido) {
        primeiroInvalido.focus();
      }
      return;
    }

    clearFormFeedback();
  });

  if (descricaoInput && charCounter) {
    const atualizarContador = () => {
      const length = descricaoInput.value.length;
      charCounter.textContent = `${Math.min(length, maxChars)} / ${maxChars}`;
      charCounter.style.color = length > maxChars - 50 ? 'red' : '';
    };

    descricaoInput.addEventListener('input', () => {
      if (descricaoInput.value.length > maxChars) {
        descricaoInput.value = descricaoInput.value.substring(0, maxChars);
      }
      atualizarContador();
    });

    atualizarContador();
  }

  if (fileInput) {
    let filePreview = document.getElementById('filePreview');
    if (!filePreview) {
      filePreview = document.createElement('div');
      filePreview.id = 'filePreview';
      filePreview.className = 'file-preview';
      fileInput.insertAdjacentElement('afterend', filePreview);
    }

    fileInput.addEventListener('change', () => {
      filePreview.innerHTML = '';
      const arquivos = Array.from(fileInput.files || []);

      for (const file of arquivos) {
        const p = document.createElement('p');
        p.textContent = `Anexo: ${file.name}`;
        filePreview.appendChild(p);
      }

      filePreview.style.display = arquivos.length > 0 ? 'block' : 'none';
    });
  }
});
