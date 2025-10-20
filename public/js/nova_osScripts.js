// Validação de formulário
const form = document.querySelector('form');
form.addEventListener('submit', function(event) {
  const nome = document.getElementById('nome').value.trim();
  const setor = document.getElementById('setor').value.trim();
  const tipo_servico = document.getElementById('tipo_servico').value.trim();
  const descricao = document.getElementById('descricao').value.trim();

if (!nome || !setor || !tipo_servico || !descricao) {
  event.preventDefault();

  [nome, setor, tipo_servico, descricao].forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add("input-error");
    } else {
      el.classList.remove("input-error");
    }
  });

  alert('Por favor, preencha todos os campos obrigatórios.');
}
});



// Pré-visualização de arquivo
const fileInput = document.getElementById('arquivo');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');

fileInput.addEventListener('change', function() {
  filePreview.innerHTML = '';
  Array.from(fileInput.files).forEach(file => {
    const p = document.createElement('p');
    p.textContent = `📎 ${file.name}`;
    filePreview.appendChild(p);
  });
  filePreview.style.display = fileInput.files.length ? 'block' : 'none';
});

// Contador de caracteres da descrição
const descricaoInput = document.getElementById('descricao');
const charCounter = document.querySelector('.char-counter');
const maxChars = 500;

descricaoInput.addEventListener('input', function() {
  const length = descricaoInput.value.length;

  // Atualiza contador
  charCounter.textContent = `${length}/${maxChars}`;

  // Se passar de 500, corta o excesso
  if (length > maxChars) {
    descricaoInput.value = descricaoInput.value.substring(0, maxChars);
    charCounter.textContent = `${maxChars}/${maxChars}`;
    alert('Limite de 500 caracteres atingido.');
  }

  // Muda a cor do contador quando estiver perto do limite
  if (length > maxChars - 50) {
    charCounter.style.color = 'red';
  } else {
    charCounter.style.color = '';
  }
});
