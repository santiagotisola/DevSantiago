namespace CondosyncEncomendas.Interfaces
{
    public interface IMoradorService
    {
        IEnumerable<MoradorDto> ListarMoradores();
        MoradorDto ObterMoradorPorId(int id);
    }
}