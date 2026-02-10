document.addEventListener('DOMContentLoaded', () => {
  const senhaInput = document.getElementById('senha');
  const toggleSenha = document.getElementById('toggleSenha');
  const capsAviso = document.getElementById('capsAviso');
  const errorMessage = document.querySelector('.message.error');

  if (!senhaInput) return;

  // 1️⃣ Mostrar / ocultar senha
  if (toggleSenha) {
    toggleSenha.addEventListener('click', () => {
      const isPassword = senhaInput.type === 'password';
      senhaInput.type = isPassword ? 'text' : 'password';

      const icon = toggleSenha.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }
    });
  }

  // 2️⃣ Aviso de Caps Lock
  senhaInput.addEventListener('keyup', (e) => {
    if (capsAviso) {
      capsAviso.style.display =
        e.getModifierState('CapsLock') ? 'block' : 'none';
    }
  });

  // 3️⃣ Validação da senha
  senhaInput.addEventListener('blur', () => {
    const valor = senhaInput.value;

    let erros = [];

    if (valor.length < 8) {
      erros.push('A senha deve ter no mínimo 8 caracteres.');
    }

    if (valor.charAt(0) !== valor.charAt(0).toUpperCase()) {
      erros.push('A senha deve começar com letra maiúscula.');
    }

    if (!/\d/.test(valor)) {
      erros.push('A senha deve conter pelo menos um número.');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(valor)) {
      erros.push('A senha deve conter um caractere especial.');
    }

    if (erros.length > 0) {
      errorMessage.innerHTML = erros.join('<br>');
      errorMessage.style.display = 'block';
    } else {
      errorMessage.style.display = 'none';
    }
  });
});
