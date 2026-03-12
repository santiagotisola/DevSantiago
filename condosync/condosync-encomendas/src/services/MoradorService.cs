using System.Collections.Generic;
using System.Threading.Tasks;
using CondosyncEncomendas.Models;
using CondosyncEncomendas.Interfaces;

namespace CondosyncEncomendas.Services
{
    public class MoradorService : IMoradorService
    {
        private readonly IMoradorRepository _moradorRepository;

        public MoradorService(IMoradorRepository moradorRepository)
        {
            _moradorRepository = moradorRepository;
        }

        public Task<List<Morador>> ListarMoradores()
        {
            return Task.FromResult(_moradorRepository.ObterTodos().ToList());
        }
    }
}