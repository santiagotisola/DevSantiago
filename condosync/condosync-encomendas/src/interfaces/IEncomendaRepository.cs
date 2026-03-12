using CondosyncEncomendas.Models;
using System.Collections.Generic;

namespace CondosyncEncomendas.Interfaces
{
    public interface IEncomendaRepository
    {
        void Adicionar(Encomenda encomenda);
        Encomenda ObterPorId(int id);
        IEnumerable<Encomenda> ObterTodos();
        void Atualizar(Encomenda encomenda);
        void Remover(int id);
    }
}