using CondosyncEncomendas.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CondosyncEncomendas.Interfaces
{
    public interface IMoradorService
    {
        Task<List<Morador>> ListarMoradores();
    }
}