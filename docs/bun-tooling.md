# Ferramentas Bun

O desenvolvimento, o CI e as imagens que já usam Bun estão fixados na versão 1.4.4. Instale as dependências com `bun install --frozen-lockfile`.

`bun run format` e `bun run format:check` usam o formatador nativo `bun fmt`, com as opções existentes em `apps/web/.oxfmtrc.json`. O Oxfmt deixou de ser uma dependência de desenvolvimento. A geração do cliente também usa `bun fmt --print-width 100`; os arquivos gerados continuam sendo produzidos pelos scripts de contratos.

`bun run typecheck` usa `bun check --no-script` nos workspaces TypeScript. A opção impede que um script chamado `check` substitua a checagem de tipos. O TypeScript continua instalado para as ferramentas de geração e o editor.

Consulte as [notas do Bun 1.4.4](https://bun.com/blog/bun-v1.4.4) e a [documentação do formatador](https://bun.com/docs/format).
