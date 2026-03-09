namespace CondosyncEncomendas.Dtos
{
    public class EncomendaDto
    {
        public int Id { get; set; }
        public string Descricao { get; set; }
        public DateTime DataRegistro { get; set; }
        public int MoradorId { get; set; }
    }
}