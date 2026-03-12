using System.Collections.Generic;
using System.Linq;
using CondosyncEncomendas.Data;
using CondosyncEncomendas.Models;
using CondosyncEncomendas.Interfaces;

namespace CondosyncEncomendas.Repositories
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

        public IEnumerable<Encomenda> ObterTodos()
        {
            return _context.Encomendas.ToList();
        }

        public Encomenda ObterPorId(int id)
        {
            return _context.Encomendas.Find(id);
        }

        public void Atualizar(Encomenda encomenda)
        {
            _context.Encomendas.Update(encomenda);
            _context.SaveChanges();
        }

        public void Remover(int id)
        {
            var encomenda = ObterPorId(id);
            if (encomenda != null)
            {
                _context.Encomendas.Remove(encomenda);
                _context.SaveChanges();
            }
        }
    }
}