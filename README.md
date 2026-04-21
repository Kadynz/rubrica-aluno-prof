# 🎓 Rubrica Aluno & Professor

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)

> Um sistema ágil de avaliação baseada em rubricas, com interfaces independentes para autoavaliação (Aluno) e gestão de desempenho (Professor). Construído para rodar 100% no navegador (Client-Side) garantindo simplicidade, segurança e portabilidade em infraestruturas educacionais limitadas.

> [!NOTE]
> Este projeto contou com a ajuda da IA do Claude Opus 4.7 da Anthropic durante seu desenvolvimento.

---

## Quick Start

1. Hospede os arquivos em um servidor estático (ex: **GitLab Pages**, **GitHub Pages**) ou abra o arquivo localmente.
2. Acesse os portais:
   - **Portal do Aluno:** `aluno/index.html` (Livre para registrar autoavaliações)
   - **Portal do Professor:** `professor/index.html` (Acesso restrito)

### Acesso do Professor
O portal do professor requer credenciais para evitar o acesso acidental em computadores compartilhados de escolas.

*As credenciais são tratadas no cliente e, portanto, restritas aos educadores com acesso a esta documentação.*

---

## Funcionalidades

### Portal do Aluno (`aluno/index.html`)
- **Autoavaliação Dinâmica:** Registro rápido de aulas e auto-percepção de nível (Iniciante ao Avançado).
- **Feedback de Ensino:** Permite avaliar a qualidade da aula transmitida pelo educador.
- **Gráficos em Tempo Real:** Evolução de desempenho acompanhada instantaneamente após salvar.

### Portal do Professor (`professor/index.html`)
- **Acesso Protegido:** "App Shell" que oculta todo o sistema até o educador realizar o login.
- **Gestão de Turmas e Alunos:** Controle completo (CRUD) de classes.
- **Avaliações e Histórico:** Filtragem ágil (debounced) por nome da aula e data.
- **Dashboard Analítico:**
  - *Evolução (Line Chart)*: Acompanha o desempenho longitudinal da turma.
  - *Quadrante (Scatter Plot)*: Identifica alunos que requerem maior atenção versus alunos estelares, cruzando Evolução x Desempenho.
- **Portabilidade (JSON Import/Export):** Devido à falta de banco de dados em nuvem, o professor pode exportar o arquivo de backups (`.json`) para uso em múltiplos computadores ou dispositivos.

---

## Arquitetura e Segurança (Local-First)

Este projeto foi desenhado sob uma arquitetura puramente **Client-Side** (Frontend apenas) por dois motivos: zero custo de infraestrutura e zero dependência de TI da escola.

> [!WARNING]
> **Modelo de Ameaças & Local Storage**
> Como não há backend (Servidor/Banco de Dados), todos os dados e credenciais residem na máquina onde a aplicação é aberta.
> 
> 1. **Armazenamento:** Os dados são mantidos na `localStorage` do navegador. Se os dados de cache do navegador forem limpos, o progresso será perdido caso não tenha sido exportado.
> 2. **Senhas:** A senha do professor está embarcada no código e ofuscada usando criptografia `SHA-256` (*Web Crypto API*). Essa medida impede que um aluno sentado no computador do professor burle a tela de login visual, mas **não** previne que alguém com conhecimento técnico inspecione o código-fonte da página ou baixe os dados da `localStorage`.
> 3. **Arquivos Exportados:** O backup gerado não é criptografado. Proteja seu `.json` com o mesmo cuidado que teria com um diário de classe físico.

---

## Acessibilidade (WCAG)

A aplicação passou por auditoria de acessibilidade para suportar o ecossistema educacional inclusivo:
- Estrutura semântica reforçada com relacionamentos `for="id"`.
- Suporte a Leitores de Tela com anúncios em tempo real utilizando `aria-live="polite"`.
- Ícones complementados por rótulos não visuais (`aria-label`).
- Atributos universais para gráficos canvas (`role="img"`).

---

## Matriz da Rubrica

| Nível | Cor | Desempenho do Aluno | Qualidade da Aula |
|-------|-----|--------------------|--------------------|
| 1  | Vermelho | Iniciante          | Confusa            |
| 2  | Laranja  | Básico             | Regular            |
| 3  | Azul     | Proficiente        | Boa                |
| 4  | Verde    | Avançado           | Excelente          |
