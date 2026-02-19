document.addEventListener('DOMContentLoaded', () => {
  const filtroInput = document.getElementById('filtro-os');
  if (filtroInput) {
    filtroInput.addEventListener('input', function() {
      const filtro = filtroInput.value.toLowerCase();
      const osList = document.querySelectorAll('.os-item');

      osList.forEach(function(item) {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(filtro) ? '' : 'none';
      });
    });
  }

  const tokenInput = document.getElementById('token-busca');
  const tokenForm = tokenInput ? tokenInput.closest('form') : null;
  const feedbackSlot = document.getElementById('tokenFormFeedback');
  const TOKEN_REGEX = /^[A-Z0-9]{6,20}$/;

  const clearFeedback = () => {
    if (feedbackSlot) {
      feedbackSlot.innerHTML = '';
    }
  };

  const renderFeedback = (text, type = 'danger') => {
    if (!feedbackSlot) return;

    feedbackSlot.innerHTML = `
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

  if (tokenInput) {
    tokenInput.addEventListener('input', () => {
      tokenInput.value = tokenInput.value.toUpperCase().replace(/\s+/g, '');
      if (tokenInput.value.trim()) {
        tokenInput.classList.remove('input-error');
      }
      clearFeedback();
    });
  }

  if (tokenForm && tokenInput) {
    tokenForm.addEventListener('submit', (event) => {
      const token = tokenInput.value.trim().toUpperCase();
      tokenInput.value = token;

      if (!TOKEN_REGEX.test(token)) {
        event.preventDefault();
        tokenInput.classList.add('input-error');
        renderFeedback('Token invalido. Use apenas letras/numeros (6 a 20 caracteres).');
        tokenInput.focus();
        return;
      }

      tokenInput.classList.remove('input-error');
      clearFeedback();
    });
  }
});
