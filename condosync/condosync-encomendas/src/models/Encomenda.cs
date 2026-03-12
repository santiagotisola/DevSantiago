namespace CondosyncEncomendas.Models
{
    public class Encomenda
    {
        public int Id { get; set; }
        public string Descricao { get; set; }
        public DateTime DataRegistro { get; set; }
        public int MoradorId { get; set; }

        // Relacionamento com a classe Morador
        public virtual Morador Morador { get; set; }
    }
}