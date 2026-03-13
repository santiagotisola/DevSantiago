using Microsoft.EntityFrameworkCore;
using condosync_encomendas.Models;

namespace condosync_encomendas.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Encomenda> Encomendas { get; set; } = null!;
        public DbSet<Morador> Moradores { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Encomenda>().HasKey(e => e.Id);
            modelBuilder.Entity<Morador>().HasKey(m => m.Id);
            modelBuilder.Entity<Encomenda>()
                .HasOne<Morador>()
                .WithMany()
                .HasForeignKey(e => e.MoradorId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}