document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");
  const senha = document.getElementById("senha");
  const toggleSenha = document.getElementById("toggleSenha");
  const capsAviso = document.getElementById("capsAviso");
  const btnLogin = document.getElementById("btnLogin");

  /* 👁 Mostrar senha */
  toggleSenha.addEventListener("click", () => {
    const isPassword = senha.type === "password";
    senha.type = isPassword ? "text" : "password";

    const icon = toggleSenha.querySelector("i");
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");
  });

  /* 🔠 Caps Lock */
  senha.addEventListener("keyup", (e) => {
    capsAviso.style.display =
      e.getModifierState("CapsLock") ? "block" : "none";
  });

  /* 🔄 Loading ao enviar */
  form.addEventListener("submit", () => {
    btnLogin.classList.add("loading");
    btnLogin.disabled = true;
  });

});
