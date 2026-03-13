using System.Collections.Generic;
using System.Threading.Tasks;
using condosync_encomendas.Models;
using condosync_encomendas.Dtos;

namespace condosync_encomendas.Interfaces
{
    public interface IEncomendaService
    {
        Task<Encomenda> CriarEncomenda(RegistrarEncomendaDto dto);
        Task<List<Encomenda>> ListarEncomendas();
    }
}