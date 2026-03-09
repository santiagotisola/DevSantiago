namespace CondosyncEncomendas.Interfaces
{
    public interface IMoradorRepository
    {
        IEnumerable<Morador> ObterTodos();
        Morador ObterPorId(int id);
        void Adicionar(Morador morador);
        void Atualizar(Morador morador);
        void Remover(int id);
    }
}