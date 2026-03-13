using System.Collections.Generic;
using System.Threading.Tasks;
using condosync_encomendas.Dtos;

namespace condosync_encomendas.Interfaces
{
    public interface IMoradorService
    {
        Task<List<MoradorDto>> ListarMoradores();
    }
}