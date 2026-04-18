# Rubrica Aluno & Professor

> Sistema de avaliação por rubrica com duas interfaces independentes: uma para o aluno registrar sua autoavaliação e outra restrita para o professor realizar avaliações individuais.

## Visão Geral

Este projeto elimina o uso de planilhas complexas, oferecendo um sistema simples em HTML/JS sem necessidade de backend, utilizando armazenamento local (`localStorage`).

### Aluno (`aluno/index.html`)
- Registro de autoavaliação (Nível 1 a 4).
- Avaliação da qualidade da aula.
- Histórico e gráficos de evolução temporal.

### Professor (`professor/index.html`)
- **Acesso Protegido**: Requer usuário e senha para acesso à área de gestão.
- Cadastro e gerenciamento de turmas e alunos.
- Avaliação de desempenho individual e histórico da turma.
- Visualização em Scatter Plot (Quadrante de Desempenho) e Line Chart (Evolução).

## Níveis de Avaliação

| Nível | Desempenho do Aluno | Qualidade da Aula |
|-------|--------------------|--------------------|
| 🔴 1  | Iniciante          | Confusa            |
| 🟠 2  | Básico             | Regular            |
| 🔵 3  | Proficiente        | Boa                |
| 🟢 4  | Avançado           | Excelente          |

## Como usar

O sistema roda diretamente no navegador, dispensando servidores locais ou banco de dados.

1. Hospede em um servidor estático (ex: GitLab Pages, GitHub Pages) ou apenas abra os arquivos localmente.
2. Navegue até o portal desejado:
   - `aluno/index.html` (Portal dos Alunos)
   - `professor/index.html` (Portal dos Professores)

*Nota: As credenciais de acesso do portal do professor são tratadas localmente. A documentação sobre credenciais padrão não é disponibilizada de forma pública.*

## Tecnologias

- HTML5 + CSS3 (Sem frameworks de terceiros)
- JavaScript Vanilla
- [Chart.js](https://www.chartjs.org/) para análise de dados e métricas
- [Font Awesome 6](https://fontawesome.com/) para ícones
- Web Crypto API para segurança de credenciais client-side
