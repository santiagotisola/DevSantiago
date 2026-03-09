using Microsoft.EntityFrameworkCore;
using src.models;

namespace src.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Encomenda> Encomendas { get; set; }
        public DbSet<Morador> Moradores { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Encomenda>()
                .HasKey(e => e.Id);

            modelBuilder.Entity<Morador>()
                .HasKey(m => m.Id);

            modelBuilder.Entity<Encomenda>()
                .HasOne<Morador>()
                .WithMany()
                .HasForeignKey(e => e.MoradorId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}