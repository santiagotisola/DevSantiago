using System.Collections.Generic;
using System.Linq;
using condosync_encomendas.Data;
using condosync_encomendas.Models;
using condosync_encomendas.Interfaces;

namespace condosync_encomendas.Repositories
{
    public class EncomendaRepository : IEncomendaRepository
    {
        private readonly AppDbContext _context;

        public EncomendaRepository(AppDbContext context)
        {
            _context = context;
        }

        public void Adicionar(Encomenda encomenda)
        {
            _context.Encomendas.Add(encomenda);
            _context.SaveChanges();
        }

        public List<Encomenda> ObterTodas()
        {
            return _context.Encomendas.ToList();
        }

        public Encomenda ObterPorId(int id)
        {
            return _context.Encomendas.Find(id);
        }
    }
}