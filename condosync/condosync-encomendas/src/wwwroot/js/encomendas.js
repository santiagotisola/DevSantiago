document.addEventListener('DOMContentLoaded', function() {
    const moradorSelect = document.getElementById('moradorSelect');

    // Função para carregar a lista de moradores
    function carregarMoradores() {
        fetch('/api/moradores')
            .then(response => response.json())
            .then(data => {
                data.forEach(morador => {
                    const option = document.createElement('option');
                    option.value = morador.id;
                    option.textContent = `${morador.nome} - Apartamento ${morador.apartamento}`;
                    moradorSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Erro ao carregar moradores:', error);
            });
    }

    // Chama a função para carregar moradores ao carregar a página
    carregarMoradores();
});