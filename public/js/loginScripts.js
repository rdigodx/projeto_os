document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");
  const feedbackSlot = document.getElementById("loginFormFeedback");
  const usuario = form ? form.querySelector('input[name="usuario"]') : null;
  const senha = document.getElementById("senha");
  const toggleSenha = document.getElementById("toggleSenha");
  const capsAviso = document.getElementById("capsAviso");
  const btnLogin = document.getElementById("btnLogin");
  const camposObrigatorios = [usuario, senha].filter(Boolean);

  if (!form) {
    return;
  }

  const clearFeedback = () => {
    if (feedbackSlot) {
      feedbackSlot.innerHTML = "";
    }
  };

  const renderFeedback = (text, type = "danger") => {
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

  const setLoading = (loading) => {
    if (!btnLogin) return;
    if (loading) {
      btnLogin.classList.add("loading");
      btnLogin.disabled = true;
      return;
    }
    btnLogin.classList.remove("loading");
    btnLogin.disabled = false;
  };

  const validateFields = () => {
    let invalid = false;

    camposObrigatorios.forEach((campo) => {
      const value = String(campo.value || "").trim();
      if (!value) {
        campo.classList.add("input-error");
        invalid = true;
      } else {
        campo.classList.remove("input-error");
      }
    });

    return !invalid;
  };

  camposObrigatorios.forEach((campo) => {
    campo.addEventListener("input", () => {
      if (String(campo.value || "").trim()) {
        campo.classList.remove("input-error");
        const hasEmpty = camposObrigatorios.some((item) => !String(item.value || "").trim());
        if (!hasEmpty) {
          clearFeedback();
        }
      }
    });
  });

  /* 👁 Mostrar senha */
  if (toggleSenha && senha) {
    toggleSenha.addEventListener("click", () => {
      const isPassword = senha.type === "password";
      senha.type = isPassword ? "text" : "password";

      const icon = toggleSenha.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
      }
    });
  }

  /* 🔠 Caps Lock */
  if (senha && capsAviso) {
    senha.addEventListener("keyup", (e) => {
      capsAviso.style.display =
        e.getModifierState("CapsLock") ? "block" : "none";
    });
  }

  /* 🔄 Loading ao enviar */
  form.addEventListener("submit", (event) => {
    if (!validateFields()) {
      event.preventDefault();
      setLoading(false);
      renderFeedback("Informe usuário e senha para continuar.");
      const firstInvalid = camposObrigatorios.find((campo) => campo.classList.contains("input-error"));
      if (firstInvalid) {
        firstInvalid.focus();
      }
      return;
    }

    clearFeedback();
    setLoading(true);
  });

});
