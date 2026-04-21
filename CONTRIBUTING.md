# Contribuindo com a Rubrica Aluno & Professor

Obrigado pelo interesse em contribuir! Este guia resume o essencial para quem for abrir *issues*, *merge requests* ou apenas rodar o projeto localmente.

## Antes de começar

- Para mudanças maiores (novas abas, mudança de estrutura de armazenamento, novos gráficos), **abra uma *issue* antes**. Isso evita trabalho duplicado e alinha a direção.
- Para correções pequenas (typos, bug pontual, ajuste visual) você pode ir direto ao MR.
- Traduções, melhorias de acessibilidade e documentação do Wiki são muito bem-vindas.

## Rodando localmente

O projeto é 100% *client-side* (HTML + CSS + JavaScript *vanilla*, sem *bundler*). **Não abra os arquivos via `file://`** — o uso da Web Crypto API (autenticação local por *hash*) exige um contexto seguro servido por HTTP.

Do diretório raiz, escolha uma destas opções:

```bash
# Python 3 (já instalado na maioria das distros)
python3 -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Depois abra `http://localhost:8000` no navegador.

## Estrutura do projeto

```
/aluno       — Portal do aluno (autoavaliação simples)
/professor   — Portal do professor (turmas, alunos, gráficos, backup)
/shared      — Utilidades reutilizadas pelos dois portais
index.html   — Menu de entrada
```

Cada portal tem três arquivos: `index.html`, `styles.css`, `script.js`. O armazenamento usa `localStorage` para dados estruturados e **IndexedDB** para fotos (ver `professor/script.js` → `prepararBackendFotos`). Não há *backend*, não há *build step*.

## Convenções de código

- JavaScript em **português** para identificadores de domínio (`aluno`, `turma`, `avaliacao`), inglês para termos técnicos consagrados (`render`, `submit`, `promise`).
- **Sem ES Modules nem *bundler*.** Funções são globais; scripts compartilhados ficam em `/shared` e são carregados antes do `script.js` de cada portal via `<script src="../shared/...">`.
- Tratamento XSS: qualquer string vinda do usuário que é inserida em HTML **precisa passar por `escapeHtml`** (definido em `shared/utils.js`).
- *Event delegation* sempre que possível — evite `onclick="..."` inline.
- Prefira *early return* a pirâmides de `if`.
- Comentários explicam *porquê*, não *o quê*. Se o código é autoexplicativo, não comente.

## Antes de abrir o MR

1. Rode `node --check` em cada arquivo JS que você tocou (o CI também faz isso, mas é mais rápido pegar localmente).
2. Teste no navegador, tanto em modo claro quanto escuro.
3. Se mexeu no formato de dados (`localStorage` ou IDB), **teste o caminho de importação/exportação** antes e depois da sua mudança — é o contrato com usuários antigos.
4. Atualize o `CHANGELOG.md` na seção `[Unreleased]`.

## Commits e mensagens

Commits seguem a convenção `tipo: descrição curta` (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). Mensagens em inglês ou português, tudo bem — o importante é serem descritivas.

Para trabalhos que envolveram IA, mantenha o trailer `Co-Authored-By: ...` no final do commit, por transparência.

## CI e segurança

O `.gitlab-ci.yml` roda SAST e *Secret Detection* automaticamente em cada MR. Se ele acusar algo, corrija antes de pedir *review* — mesmo que pareça falso-positivo, vale comentar justificando.

## Dúvidas

Abra uma *issue* com a *label* `question` ou comente no Wiki. Respostas podem demorar, mas chegam.
