# Rubrica Aluno & Professor

> Um sistema ágil e 100% *client-side* de avaliação baseada em rubricas, com interfaces independentes para autoavaliação e gestão de turmas.

[![Licença: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

> [!WARNING]
> **AVISO DE IA**: Este projeto contou com a ajuda da IA do Claude Opus 4.7 da Anthropic durante seu desenvolvimento.

## Por Que Isso Existe

Em muitas escolas e infraestruturas educacionais limitadas, o acesso a sistemas complexos com banco de dados em nuvem não é viável ou não é aprovado pela TI local. A **Rubrica Aluno & Professor** resolve isso rodando totalmente no navegador (*local-first*). Ela permite que alunos façam autoavaliações rápidas e professores acompanhem o progresso através de gráficos analíticos em tempo real, sem nenhum custo de infraestrutura de servidor ou instalação complexa.

## Início Rápido

O caminho mais curto para rodar a aplicação no seu navegador.

```bash
# Clone o repositório
git clone https://gitlab.com/kadynz/rubrica-aluno-prof.git
cd rubrica-aluno-prof

# Inicie um servidor HTTP local
python3 -m http.server 8000
```

Abra `http://localhost:8000/` no seu navegador. 

## Instalação

**Pré-requisitos**: Um servidor web estático básico (Node `serve`, Python `http.server`, Nginx, Apache) ou plataformas de hospedagem como GitLab Pages / GitHub Pages.

1. Baixe os arquivos do projeto.
2. Coloque-os no diretório público do seu servidor web.
3. Não abra os arquivos diretamente via `file://` no navegador, pois isso gera restrições restritas de segurança (CORS) que podem quebrar os scripts. Utilize sempre os protocolos `http://` ou `https://`.

Para um deploy automatizado, o repositório já inclui um arquivo `.gitlab-ci.yml` configurado para gerar a build pública no GitLab Pages, com análises automáticas de segurança (SAST e Secret Detection).

## Uso

### Acesso aos Portais

A página `index.html` principal atua como um menu direcional, mas você pode navegar diretamente para:
- **Portal do Aluno:** `/aluno/index.html` (Livre para registrar as autoavaliações)
- **Portal do Professor:** `/professor/index.html` (Acesso restrito por senha local)

### Fluxo Básico (Professor)

1. Acesse o **Portal do Professor** e defina sua senha no primeiro uso (ela ficará armazenada com *hash* no seu próprio navegador).
2. Na aba **Turmas**, crie uma nova classe e cadastre seus alunos.
3. Peça aos alunos que utilizem o **Portal do Aluno** após cada aula para enviar suas autoavaliações.
4. Volte ao Portal do Professor para visualizar o painel analítico sendo atualizado instantaneamente, mostrando a progressão longitudinal (Gráfico de Evolução) e mapeando quem precisa de atenção cruzado contra alunos estelares (Gráfico Quadrante).

### Configuração e Backup (Portabilidade)

Como o sistema é *offline-first* e usa armazenamento local, trocar de computador significa iniciar com o sistema vazio. Use as ferramentas de exportação nativas para migrar entre máquinas:

| Ação | Onde Fica | Descrição |
|--------|------|-------------|
| **Exportar** | Aba Inferior (Professor) | Baixa um arquivo `.json` (backup total) ou `.csv` (dados tabulares) com turmas, alunos e notas. |
| **Importar** | Aba Inferior (Professor) | Carrega um `.json` ou `.csv` previamente exportado para restaurar os dados no dispositivo atual. |

## Referência Completa (Wiki)

A arquitetura profunda, matrizes da rubrica, fluxos de LGPD e segurança da aplicação encontram-se rigorosamente documentados no nosso Wiki.

[Veja a Documentação Completa (Wiki) →](https://gitlab.com/kadynz/rubrica-aluno-prof/-/wikis/home)

## Contribuição

Contribuições para o código, traduções e documentações são muito bem-vindas. Abra uma *issue* para discussão prévia antes de abrir *pull requests* grandes.

## Licença

Apache-2.0 © [kadynz](https://gitlab.com/kadynz)
