using condosync_encomendas.Models;

namespace condosync_encomendas.Interfaces
{
    public interface IEncomendaRepository
    {
        void Adicionar(Encomenda encomenda);
        IEnumerable<Encomenda> ObterTodas();
        Encomenda? ObterPorId(int id);
    }
}