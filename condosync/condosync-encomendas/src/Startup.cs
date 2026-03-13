using Microsoft.EntityFrameworkCore;
using condosync_encomendas.Data;
using condosync_encomendas.Interfaces;
using condosync_encomendas.Repositories;
using condosync_encomendas.Services;

namespace condosync_encomendas
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));

            services.AddScoped<IEncomendaRepository, EncomendaRepository>();
            services.AddScoped<IMoradorRepository, MoradorRepository>();
            services.AddScoped<IEncomendaService, EncomendaService>();
            services.AddScoped<IMoradorService, MoradorService>();

            services.AddControllersWithViews();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseDeveloperExceptionPage();
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "CondoSync Encomendas v1");
                c.RoutePrefix = "swagger";
            });

            app.UseStaticFiles();
            app.UseRouting();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
                endpoints.MapControllers();
            });
        }
    }
}
