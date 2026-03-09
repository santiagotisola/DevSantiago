using System.Collections.Generic;
using System.Linq;
using Xunit;
using condosync_encomendas.services;
using condosync_encomendas.models;
using condosync_encomendas.repositories;

namespace condosync_encomendas.tests
{
    public class MoradorServiceTests
    {
        private readonly IMoradorService _moradorService;
        private readonly IMoradorRepository _moradorRepository;

        public MoradorServiceTests()
        {
            _moradorRepository = new MoradorRepositoryMock();
            _moradorService = new MoradorService(_moradorRepository);
        }

        [Fact]
        public void ListarMoradores_DeveRetornarListaDeMoradores()
        {
            // Act
            var moradores = _moradorService.ListarMoradores();

            // Assert
            Assert.NotNull(moradores);
            Assert.True(moradores.Count() > 0);
        }

        [Fact]
        public void ListarMoradores_DeveRetornarMoradoresCorretos()
        {
            // Act
            var moradores = _moradorService.ListarMoradores().ToList();

            // Assert
            Assert.Equal(2, moradores.Count);
            Assert.Equal("Santiago", moradores[0].Nome);
            Assert.Equal("Maria", moradores[1].Nome);
        }
    }

    public class MoradorRepositoryMock : IMoradorRepository
    {
        public IEnumerable<Morador> ObterTodos()
        {
            return new List<Morador>
            {
                new Morador { Id = 1, Nome = "Santiago", Apartamento = "101" },
                new Morador { Id = 2, Nome = "Maria", Apartamento = "102" }
            };
        }
    }
}