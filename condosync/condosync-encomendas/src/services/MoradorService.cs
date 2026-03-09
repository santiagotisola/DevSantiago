using System.Collections.Generic;
using System.Threading.Tasks;
using condosync_encomendas.src.models;
using condosync_encomendas.src.interfaces;

namespace condosync_encomendas.src.services
{
    public class MoradorService : IMoradorService
    {
        private readonly IMoradorRepository _moradorRepository;

        public MoradorService(IMoradorRepository moradorRepository)
        {
            _moradorRepository = moradorRepository;
        }

        public async Task<List<Morador>> ListarMoradores()
        {
            return await _moradorRepository.ObterTodos();
        }
    }
}