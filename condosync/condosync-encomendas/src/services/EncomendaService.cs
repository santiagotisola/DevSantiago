using System.Collections.Generic;
using System.Threading.Tasks;
using condosync_encomendas.src.models;
using condosync_encomendas.src.repositories;
using condosync_encomendas.src.interfaces;

namespace condosync_encomendas.src.services
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

        public async Task<Encomenda> CriarEncomenda(RegistrarEncomendaDto registrarEncomendaDto)
        {
            var encomenda = new Encomenda
            {
                Descricao = registrarEncomendaDto.Descricao,
                DataRegistro = DateTime.Now,
                MoradorId = registrarEncomendaDto.MoradorId
            };

            await _encomendaRepository.Adicionar(encomenda);
            return encomenda;
        }

        public async Task<List<Encomenda>> ListarEncomendas()
        {
            return await _encomendaRepository.ObterTodos();
        }
    }
}