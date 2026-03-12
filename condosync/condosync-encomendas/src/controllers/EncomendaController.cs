using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using CondosyncEncomendas.Models;
using CondosyncEncomendas.Interfaces;
using CondosyncEncomendas.Dtos;

namespace CondosyncEncomendas.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EncomendaController : ControllerBase
    {
        private readonly IEncomendaService _encomendaService;
        private readonly IMoradorService _moradorService;

        public EncomendaController(IEncomendaService encomendaService, IMoradorService moradorService)
        {
            _encomendaService = encomendaService;
            _moradorService = moradorService;
        }

        [HttpPost("registrar")]
        public async Task<IActionResult> RegistrarEncomenda([FromBody] RegistrarEncomendaDto registrarEncomendaDto)
        {
            if (registrarEncomendaDto == null || registrarEncomendaDto.MoradorId <= 0)
            {
                return BadRequest("Dados inválidos para registrar a encomenda.");
            }

            var encomenda = await _encomendaService.CriarEncomenda(registrarEncomendaDto);
            return CreatedAtAction(nameof(RegistrarEncomenda), new { id = encomenda.Id }, encomenda);
        }

        [HttpGet("moradores")]
        public async Task<ActionResult<IEnumerable<MoradorDto>>> ObterMoradores()
        {
            var moradores = await _moradorService.ListarMoradores();
            return Ok(moradores);
        }
    }
}