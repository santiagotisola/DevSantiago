namespace condosync_encomendas.Models
{
    public class Encomenda
    {
        public int Id { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public DateTime DataRegistro { get; set; }
        public int MoradorId { get; set; }
        public virtual Morador? Morador { get; set; }
    }
}