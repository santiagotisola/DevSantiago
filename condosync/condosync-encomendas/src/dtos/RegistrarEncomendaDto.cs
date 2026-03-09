namespace CondosyncEncomendas.Dtos
{
    public class RegistrarEncomendaDto
    {
        public int MoradorId { get; set; }
        public string Descricao { get; set; }
        public DateTime DataRegistro { get; set; }
    }
}