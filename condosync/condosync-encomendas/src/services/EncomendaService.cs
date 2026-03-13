using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using condosync_encomendas.Models;
using condosync_encomendas.Interfaces;
using condosync_encomendas.Dtos;

namespace condosync_encomendas.Services
{
    public class EncomendaService : IEncomendaService
    {
        private readonly IEncomendaRepository _encomendaRepository;

        public EncomendaService(IEncomendaRepository encomendaRepository)
        {
            _encomendaRepository = encomendaRepository;
        }

        public Task<Encomenda> CriarEncomenda(RegistrarEncomendaDto dto)
        {
            var encomenda = new Encomenda
            {
                Descricao = dto.Descricao,
                DataRegistro = DateTime.Now,
                MoradorId = dto.MoradorId
            };
            _encomendaRepository.Adicionar(encomenda);
            return Task.FromResult(encomenda);
        }

        public Task<List<Encomenda>> ListarEncomendas()
        {
            return Task.FromResult(_encomendaRepository.ObterTodas().ToList());
        }
    }
}