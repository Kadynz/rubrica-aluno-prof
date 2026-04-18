# Rúbrica Aluno & Professor

Sistema de avaliação por rúbrica com duas interfaces independentes: uma para o aluno registrar sua autoavaliação e outra para o professor avaliar cada aluno individualmente.

## Funcionalidades

### Aluno (`aluno/index.html`)
- Autoavaliação por nível de desempenho (1 a 4)
- Avaliação da qualidade da aula
- Gráfico de evolução ao longo do tempo
- Histórico de registros com edição e exclusão
- Armazenamento local (localStorage)

### Professor (`professor/index.html`)
- Cadastro de turmas e alunos
- Avaliação individual: desempenho, qualidade da aula e evolução
- Histórico por aluno
- Gráfico de linha com evolução de todos os alunos da turma
- Quadrante de desempenho (scatter plot) por média
- Armazenamento local (localStorage)

## Rúbrica de níveis

| Nível | Desempenho do aluno | Qualidade da aula |
|-------|--------------------|--------------------|
| 🔴 1  | Iniciante          | Confusa            |
| 🟠 2  | Básico             | Regular            |
| 🔵 3  | Proficiente        | Boa                |
| 🟢 4  | Avançado           | Excelente          |

## Como usar

Abra diretamente no navegador — não requer servidor ou instalação:

```
aluno/index.html     → interface do aluno
professor/index.html → interface do professor
```

## Tecnologias

- HTML5 + CSS3 (puro, sem framework)
- JavaScript vanilla
- [Chart.js](https://www.chartjs.org/) para gráficos
- [Font Awesome 6](https://fontawesome.com/) para ícones
- localStorage para persistência de dados
