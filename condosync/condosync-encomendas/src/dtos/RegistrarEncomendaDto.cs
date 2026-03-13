using System.Collections.Generic;

namespace condosync_encomendas.Dtos
{
    public class RegistrarEncomendaDto
    {
        public int MoradorId { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public DateTime DataRegistro { get; set; }
        public IEnumerable<MoradorDto>? Moradores { get; set; }
    }
}