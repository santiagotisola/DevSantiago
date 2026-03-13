using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using condosync_encomendas.Interfaces;
using condosync_encomendas.Dtos;

namespace condosync_encomendas.Services
{
    public class MoradorService : IMoradorService
    {
        private readonly IMoradorRepository _moradorRepository;

        public MoradorService(IMoradorRepository moradorRepository)
        {
            _moradorRepository = moradorRepository;
        }

        public Task<List<MoradorDto>> ListarMoradores()
        {
            var dtos = _moradorRepository.ObterTodos()
                .Select(m => new MoradorDto { Id = m.Id, Nome = m.Nome, Apartamento = m.Apartamento })
                .ToList();
            return Task.FromResult(dtos);
        }
    }
}