using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Moq;
using condosync_encomendas.src.models;
using condosync_encomendas.src.services;
using condosync_encomendas.src.interfaces;

namespace condosync_encomendas.tests
{
    public class EncomendaServiceTests
    {
        private readonly Mock<IEncomendaRepository> _encomendaRepositoryMock;
        private readonly Mock<IMoradorRepository> _moradorRepositoryMock;
        private readonly EncomendaService _encomendaService;

        public EncomendaServiceTests()
        {
            _encomendaRepositoryMock = new Mock<IEncomendaRepository>();
            _moradorRepositoryMock = new Mock<IMoradorRepository>();
            _encomendaService = new EncomendaService(_encomendaRepositoryMock.Object, _moradorRepositoryMock.Object);
        }

        [Fact]
        public void CriarEncomenda_ValidaEncomenda_EncomendaCriada()
        {
            // Arrange
            var moradorId = 1;
            var encomenda = new Encomenda
            {
                Descricao = "Teste de encomenda",
                MoradorId = moradorId,
                DataRegistro = DateTime.Now
            };

            _moradorRepositoryMock.Setup(m => m.ObterTodos()).Returns(new List<Morador>
            {
                new Morador { Id = moradorId, Nome = "Morador Teste", Apartamento = "101" }
            });

            // Act
            _encomendaService.CriarEncomenda(encomenda);

            // Assert
            _encomendaRepositoryMock.Verify(r => r.Adicionar(It.IsAny<Encomenda>()), Times.Once);
        }

        [Fact]
        public void CriarEncomenda_MoradorInexistente_LancaExcecao()
        {
            // Arrange
            var encomenda = new Encomenda
            {
                Descricao = "Teste de encomenda",
                MoradorId = 999, // Morador que não existe
                DataRegistro = DateTime.Now
            };

            // Act & Assert
            Assert.Throws<InvalidOperationException>(() => _encomendaService.CriarEncomenda(encomenda));
        }

        [Fact]
        public void ListarEncomendas_RetornaListaDeEncomendas()
        {
            // Arrange
            var encomendas = new List<Encomenda>
            {
                new Encomenda { Id = 1, Descricao = "Encomenda 1", MoradorId = 1, DataRegistro = DateTime.Now },
                new Encomenda { Id = 2, Descricao = "Encomenda 2", MoradorId = 2, DataRegistro = DateTime.Now }
            };

            _encomendaRepositoryMock.Setup(r => r.ObterTodos()).Returns(encomendas);

            // Act
            var result = _encomendaService.ListarEncomendas();

            // Assert
            Assert.Equal(2, result.Count());
        }
    }
}