using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using condosync_encomendas.Interfaces;
using condosync_encomendas.Dtos;

namespace condosync_encomendas.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoradorController : ControllerBase
    {
        private readonly IMoradorService _moradorService;

        public MoradorController(IMoradorService moradorService)
        {
            _moradorService = moradorService;
        }

        [HttpGet("obter-moradores")]
        public async Task<ActionResult<IEnumerable<MoradorDto>>> ObterMoradores()
        {
            var moradores = await _moradorService.ListarMoradores();
            return Ok(moradores);
        }
    }
}