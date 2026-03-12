using System.Collections.Generic;
using System.Threading.Tasks;
using CondosyncEncomendas.Dtos;
using CondosyncEncomendas.Models;
using CondosyncEncomendas.Repositories;
using CondosyncEncomendas.Interfaces;

namespace CondosyncEncomendas.Services
{
    public class EncomendaService : IEncomendaService
    {
        private readonly IEncomendaRepository _encomendaRepository;
        private readonly IMoradorRepository _moradorRepository;

        public EncomendaService(IEncomendaRepository encomendaRepository, IMoradorRepository moradorRepository)
        {
            _encomendaRepository = encomendaRepository;
            _moradorRepository = moradorRepository;
        }

        public Task<Encomenda> CriarEncomenda(RegistrarEncomendaDto registrarEncomendaDto)
        {
            var encomenda = new Encomenda
            {
                Descricao = registrarEncomendaDto.Descricao,
                DataRegistro = DateTime.Now,
                MoradorId = registrarEncomendaDto.MoradorId
            };

            _encomendaRepository.Adicionar(encomenda);
            return Task.FromResult(encomenda);
        }

        public Task<List<Encomenda>> ListarEncomendas()
        {
            return Task.FromResult(_encomendaRepository.ObterTodos().ToList());
        }
    }
}