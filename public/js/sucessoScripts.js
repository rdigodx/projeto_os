/**
 * public/js/sucessoScripts.js
 *
 * Este script gerencia a interatividade na página de sucesso.
 */

// Adiciona um ouvinte de eventos que espera o DOM (a estrutura da página) ser completamente carregado.
document.addEventListener('DOMContentLoaded', () => {
  // Seleciona os elementos HTML necessários e os armazena em constantes.
  const tokenHighlight = document.querySelector('.token-highlight');
  const countdownElement = document.querySelector('.countdown span');
  const tokenSpan = document.getElementById('token');


  // --- Funcionalidade de Copiar Token ---
  // Verifica se os elementos para o token existem na página.
  if (tokenHighlight && tokenSpan) {
    // Pega o texto do token e remove espaços em branco extras.
    const token = tokenSpan.innerText.trim();

    // Cria um elemento de botão dinamicamente.
    // Fazer isso via JS garante que o botão só apareça se o script for executado com sucesso.
    const copyButton = document.createElement('button');
    // Adiciona classes CSS para estilizar o botão.
    copyButton.classList.add('btn', 'copy-btn');
    // Define o conteúdo HTML do botão (ícone + texto).
    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar';

    // Adiciona o botão recém-criado dentro do contêiner do token.
    tokenHighlight.appendChild(copyButton);

    // Adiciona um ouvinte de evento para o clique no botão.
    copyButton.addEventListener('click', () => {
      // Usa a API do Clipboard do navegador para copiar o texto do token.
      navigator.clipboard.writeText(token).then(() => {
        // --- SUCESSO AO COPIAR ---
        // Altera o texto e o ícone do botão para dar feedback ao usuário.
        copyButton.innerHTML = '<i class="fas fa-check"></i> Copiado!';
        // Desabilita o botão para evitar cliques repetidos.
        copyButton.disabled = true;
        // Muda a cor de fundo para verde (sucesso).
        copyButton.style.backgroundColor = 'var(--cor-sucesso)';

        // Define um temporizador para reverter o botão ao seu estado original após 2 segundos.
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar';
          copyButton.disabled = false;
          copyButton.style.backgroundColor = ''; // Remove a cor de fundo inline, voltando ao estilo do CSS.
        }, 2000);
      }).catch(err => {
        // --- ERRO AO COPIAR ---
        console.error('Falha ao copiar o token: ', err);
        // Altera o botão para fornecer feedback de erro.
        copyButton.innerHTML = '<i class="fas fa-times"></i> Erro!';
        copyButton.style.backgroundColor = 'var(--cor-perigo)';
        copyButton.disabled = true;
        // Define um temporizador para reverter o botão ao estado original.
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fas fa-copy"></i> Copiar';
          copyButton.disabled = false;
          copyButton.style.backgroundColor = '';
        }, 2000);
      });
    });
  }

  // --- Contador Regressivo para Redirecionamento ---
  // Verifica se o elemento do contador existe.
  if (countdownElement) {
    // Define o tempo inicial em segundos.
    let timeLeft = 15; // Tempo em segundos

    // Cria um intervalo que executa uma função a cada 1000 milissegundos (1 segundo).
    const countdownInterval = setInterval(() => {
      timeLeft--;
      // Atualiza o texto do contador na página.
      countdownElement.textContent = timeLeft;

      // Quando o tempo chegar a zero.
      if (timeLeft <= 0) {
        clearInterval(countdownInterval); // Para o contador.
        // Redireciona o navegador para a página inicial.
        window.location.href = '/';
      }
    }, 1000); // Atualiza a cada segundo
  }
});