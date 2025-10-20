document.addEventListener('DOMContentLoaded', () => {
  // --- Elementos do formulário de login ---
  const senhaInput = document.getElementById('senha');
  const toggleSenha = document.getElementById('toggleSenha');
  const capsAviso = document.getElementById('capsAviso');
  const errorMessage = document.querySelector('.message.error');

  // --- Lógica para o formulário ---
  if (senhaInput) {
    // 1. Alternar visibilidade da senha
    if (toggleSenha) {
      toggleSenha.addEventListener('click', () => {
        const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
        senhaInput.setAttribute('type', type);

        // Alterna o ícone de olho
        const icon = toggleSenha.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        }
      });
    }

    // 2. Aviso de Caps Lock
    if (capsAviso) {
    senhaInput.addEventListener('keyup', (e) => {
      capsAviso.style.display = e.getModifierState('CapsLock') ? 'block' : 'none';
    });
    }
  }
});