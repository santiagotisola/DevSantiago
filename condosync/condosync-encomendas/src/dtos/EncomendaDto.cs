namespace condosync_encomendas.Dtos
{
    public class EncomendaDto
    {
        public int Id { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public DateTime DataRegistro { get; set; }
        public int MoradorId { get; set; }
    }
}