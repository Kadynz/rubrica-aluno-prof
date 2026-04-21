# Changelog

Todas as alterações notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto utiliza o histórico de commits como referência cronológica.

---

## [2026-04-20]

### Adicionado
- **`a361206` — feat: optional per-student photo with LGPD consent gate**
  Foto opcional por aluno no portal do professor, armazenada como *data URL* de JPEG redimensionado (256x256, ~100 KB) na `localStorage`. Entrada aceita JPG/PNG/WebP, mínimo 100x100 e máximo 10 MB. Na primeira foto, um modal de consentimento LGPD (Lei 13.709/2018 e Art. 20 do Código Civil) é exibido; o aceite fica persistido e um banner permanente permite reabrir os termos. Alunos sem foto continuam usando iniciais coloridas, garantindo compatibilidade com backups antigos. Erros de quota são capturados e orientam o professor a exportar backup.

---

## [2026-04-19]

### Adicionado / Corrigido / Removido
- **`6622522` — feat: dark mode fixes, signup/login system, and code cleanup**
  - **Dark mode:** cores *hardcoded* substituídas por variáveis CSS na tela de login, modais, filtros e *chips* de rubrica; cor e *placeholder* de inputs tematizados; textos de eixos e legenda do Chart.js passam a seguir o tema ativo.
  - **Autenticação:** credenciais *hardcoded* (`edkra` / `edkratos13082PROF`) removidas. Primeiro acesso exibe *signup* (usuário + senha, com aviso de que não há recuperação); acessos seguintes exibem *login*. Credenciais ficam na `localStorage` com `SHA-256` + *salt* aleatório por conta. Fluxo "esqueci a senha" com dupla confirmação para limpar todos os dados.
  - **Limpeza:** remoção das variáveis não utilizadas `--btn-edit-bg` / `--btn-edit-text` (ambos os portais) e `--evo1-*` / `--evo2-*` (apenas aluno). Remoção do *wrap* incorreto de `escapeHtml()` em *labels* de *dataset* do Chart.js, que gerava entidades HTML visíveis.

---

## [2026-04-18]

### Adicionado
- **`9fc85be` — Adiciona interfaces de aluno e professor com README atualizado**
  Entrega inicial do produto: portais independentes do aluno e do professor, com README descrevendo arquitetura, segurança e matriz de rubrica. Co-autoria de Claude Sonnet 4.6.
- **`31350f7` — Add MIT License**
  Inclusão da licença MIT no repositório.
- **`e858954` — Refactor: Extract CSS/JS, optimize performance, and enhance security**
  Extração de CSS e JS para arquivos dedicados, otimizações de performance e reforço da camada de segurança *client-side*.
- **`57b6592` — Configure GitLab Pages and add root index**
  Configuração do GitLab Pages e criação do `index.html` raiz redirecionando aos portais.
- **`8075771` — Add password protection to professor portal**
  Proteção por senha no portal do professor, com *App Shell* ocultando o sistema até o login.
- **`c422207` — Update security settings: modify access hash**
  Ajuste do *hash* de acesso embarcado no cliente.
- **`70005c2` — Update authentication mechanics: add user validation layer**
  Camada adicional de validação de usuário no fluxo de autenticação.
- **`4c6dc8c` — Add history filters by lesson and date**
  Filtros no histórico por nome de aula e por data, com *debounce* para busca ágil.
- **`899b013` — Add export/import data functionality**
  Primeira versão de exportação e importação de dados para uso em múltiplos dispositivos.
- **`6642236` — feat: enhance export with JSON/CSV formats, add security and a11y improvements**
  Exportação enriquecida com formatos JSON e CSV, além de melhorias de segurança e acessibilidade.
- **`6b49cbc` — feat: add individual student export and optimize DOM generation**
  Exportação individual por aluno e otimizações na geração dinâmica do DOM.
- **`dd832b1` — feat: add CSV import support and parser**
  *Parser* de CSV e suporte completo à importação nesse formato.
- **`d7f7ee1` — style: align export/import buttons using inline-flex and fa-fw**
  Alinhamento dos botões de exportação e importação via `inline-flex` e `fa-fw`.
- **`a682ac2` — feat: implement dark mode with CSS variables and local storage**
  Implementação do *dark mode* com variáveis CSS e preferência persistida na `localStorage`.
- **`37f59d4` — fix: ensure dark mode button is visible above login, extend support to aluno portal**
  Botão de tema visível acima da tela de login e suporte a *dark mode* estendido ao portal do aluno.
- **`7ec155f` — fix: reset button icon styles to prevent card-header oval background inheritance**
  Reset de estilos em ícones de botão para impedir herança do fundo oval do *card-header*.
- **`ee4f14a` — style: refine card-header layout and remove oval button background**
  Fundo em forma de pílula substituído por transparente (mais consistente entre tema claro e escuro), aumento do *gap* ícone-texto de 6px para 10px e remoção do subtítulo para um cabeçalho mais compacto em mobile e desktop.

### Infraestrutura
- **`15952c5` — Configure Secret Detection in `.gitlab-ci.yml`**
  Ativação do *Secret Detection* do GitLab no *pipeline* CI.
- **`7517a9d` — Configure SAST in `.gitlab-ci.yml`**
  Ativação do SAST (*Static Application Security Testing*) do GitLab no *pipeline* CI.
- **`0c9e46c` — Initial commit**
  Commit inicial do repositório.
