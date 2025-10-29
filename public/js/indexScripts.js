// Filtro de OS
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

// Atualização automática
setInterval(function() {
  fetch('/os/listar') 
    .then(response => response.json())
    .then(data => {
      console.log('Atualização de OS:', data);
      // Atualizar a lista de OS aqui
    })
    .catch(err => console.error('Erro ao atualizar OS:', err));
}, 30000);
