# Condosync Encomendas

Este projeto é uma aplicação para gerenciar encomendas em um condomínio. Ele permite o registro de novas encomendas, associando-as a moradores cadastrados.

## Estrutura do Projeto

- **src**: Contém o código-fonte da aplicação.
  - **controllers**: Controladores que gerenciam as operações de encomendas e moradores.
    - `EncomendaController.cs`: Gerencia operações relacionadas a encomendas.
    - `MoradorController.cs`: Gerencia operações relacionadas a moradores.
  - **models**: Define as entidades do sistema.
    - `Encomenda.cs`: Representa uma encomenda.
    - `Morador.cs`: Representa um morador.
  - **services**: Contém a lógica de negócios.
    - `EncomendaService.cs`: Lógica para gerenciar encomendas.
    - `MoradorService.cs`: Lógica para gerenciar moradores.
  - **repositories**: Responsáveis pela persistência de dados.
    - `EncomendaRepository.cs`: Persistência de dados das encomendas.
    - `MoradorRepository.cs`: Persistência de dados dos moradores.
  - **interfaces**: Define as interfaces para os serviços e repositórios.
    - `IEncomendaService.cs`: Interface para o serviço de encomendas.
    - `IMoradorService.cs`: Interface para o serviço de moradores.
    - `IEncomendaRepository.cs`: Interface para o repositório de encomendas.
    - `IMoradorRepository.cs`: Interface para o repositório de moradores.
  - **dtos**: Objetos de transferência de dados.
    - `EncomendaDto.cs`: DTO para encomendas.
    - `RegistrarEncomendaDto.cs`: DTO para registrar uma nova encomenda.
    - `MoradorDto.cs`: DTO para moradores.
  - **wwwroot**: Contém arquivos estáticos.
    - **css**: Estilos CSS para a interface de encomendas.
      - `encomendas.css`
    - **js**: Código JavaScript para a interação da interface de encomendas.
      - `encomendas.js`
  - **Views**: Contém as views da aplicação.
    - **Encomendas**: Views relacionadas a encomendas.
      - `Index.cshtml`: Exibe a lista de encomendas.
      - `Registrar.cshtml`: Formulário para registrar uma nova encomenda.
  - **Data**: Contexto do banco de dados.
    - `AppDbContext.cs`: Configura as entidades e a conexão com o banco.
  - `Program.cs`: Ponto de entrada da aplicação.
  - `appsettings.json`: Configurações da aplicação.

- **tests**: Contém os testes unitários.
  - `EncomendaServiceTests.cs`: Testes para a classe EncomendaService.
  - `MoradorServiceTests.cs`: Testes para a classe MoradorService.

- **condosync-encomendas.csproj**: Arquivo do projeto .NET.

## Funcionalidades

- Registro de novas encomendas com seleção de moradores.
- Listagem de moradores disponíveis para seleção.
- Persistência de dados em um banco de dados.

## Como Executar

1. Clone o repositório.
2. Navegue até o diretório do projeto.
3. Execute o comando `dotnet run` para iniciar a aplicação.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.