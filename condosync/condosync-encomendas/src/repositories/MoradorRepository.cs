using System.Collections.Generic;
using System.Linq;
using CondosyncEncomendas.Data;
using CondosyncEncomendas.Models;
using CondosyncEncomendas.Interfaces;

namespace CondosyncEncomendas.Repositories
{
    public class MoradorRepository : IMoradorRepository
    {
        private readonly AppDbContext _context;

        public MoradorRepository(AppDbContext context)
        {
            _context = context;
        }

        public IEnumerable<Morador> ObterTodos()
        {
            return _context.Moradores.ToList();
        }

        public Morador ObterPorId(int id)
        {
            return _context.Moradores.Find(id);
        }

        public void Adicionar(Morador morador)
        {
            _context.Moradores.Add(morador);
            _context.SaveChanges();
        }

        public void Atualizar(Morador morador)
        {
            _context.Moradores.Update(morador);
            _context.SaveChanges();
        }

        public void Remover(int id)
        {
            var morador = ObterPorId(id);
            if (morador != null)
            {
                _context.Moradores.Remove(morador);
                _context.SaveChanges();
            }
        }
    }
}