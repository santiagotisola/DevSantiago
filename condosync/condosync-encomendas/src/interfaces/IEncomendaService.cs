using CondosyncEncomendas.Dtos;
using CondosyncEncomendas.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CondosyncEncomendas.Interfaces
{
    public interface IEncomendaService
    {
        Task<Encomenda> CriarEncomenda(RegistrarEncomendaDto registrarEncomendaDto);
        Task<List<Encomenda>> ListarEncomendas();
    }
}