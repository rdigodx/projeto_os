document.addEventListener('DOMContentLoaded', () => {
  const countdownElement = document.querySelector('.countdown span');
  const tokenSpan = document.getElementById('token');
  const copyButton = document.getElementById('copyTokenBtn');

  const setCopyButtonState = (state) => {
    if (!copyButton) {
      return;
    }

    if (state === 'success') {
      copyButton.innerHTML = '<i class="fas fa-check"></i> Copiado!';
      copyButton.disabled = true;
      copyButton.style.backgroundColor = 'var(--cor-sucesso)';
      return;
    }

    if (state === 'error') {
      copyButton.innerHTML = '<i class="fas fa-times"></i> Erro!';
      copyButton.disabled = true;
      copyButton.style.backgroundColor = 'var(--cor-perigo)';
      return;
    }

    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar';
    copyButton.disabled = false;
    copyButton.style.backgroundColor = '';
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (err) {
      copied = false;
    }

    document.body.removeChild(textarea);
    return copied;
  };

  const copyToken = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    return fallbackCopy(text);
  };

  if (copyButton && tokenSpan) {
    const token = tokenSpan.textContent.trim();

    copyButton.addEventListener('click', async () => {
      try {
        const copied = await copyToken(token);
        if (!copied) {
          throw new Error('Nao foi possivel copiar token.');
        }
        setCopyButtonState('success');
      } catch (err) {
        setCopyButtonState('error');
      } finally {
        setTimeout(() => setCopyButtonState('idle'), 2000);
      }
    });
  }

  if (countdownElement) {
    let timeLeft = Number(countdownElement.textContent) || 15;

    const countdownInterval = setInterval(() => {
      timeLeft -= 1;
      countdownElement.textContent = timeLeft;

      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        window.location.href = '/';
      }
    }, 1000);
  }
});
