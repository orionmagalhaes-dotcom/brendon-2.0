# Saascesas

Sistema web estatico (PWA) para controle de restaurante/bar.

## Build local

```bash
npm install
npm run dev
npm run build
```

A pasta de saida sera `dist/`.

## Impressao direta na MTP-II (58 mm)

### Computador Windows (recomendado)

1. Pareie/instale a MTP-II no Windows; ela precisa aparecer na lista de impressoras do sistema.
2. Entre como administrador e abra `Monitor em Tempo Real` > `Impressão`.
3. Abra o QZ Tray e, no sistema, clique em **Buscar impressoras**.
4. Selecione a impressora desejada para cupom/cozinha, salve e clique em **Imprimir teste**.

O QZ Tray permite que o sistema envie o cupom diretamente para a impressora, sem abrir a janela de impressão. Para alternar entre duas impressoras, escolha a desejada nos campos de cupom e cozinha.

### Smartphone Android

Cada celular imprime localmente. Pareie a MTP-II, instale o RawBT e aceite a abertura do aplicativo quando o navegador solicitar. Use `Ver cupom` ou finalize uma comanda para testar.

O cupom atual e comercial. Para gerar DANFE NFC-e, a venda precisa primeiro ser autorizada por uma integracao fiscal segura (UF, certificado e provedor/SEFAZ); a MTP-II apenas imprime o documento autorizado.

## Impressao instantanea da cozinha

Depois da configuração automática, a cozinha usa a mesma MTP-II selecionada. Se quiser outra impressora para a cozinha, informe-a na seção `Impressora da cozinha` e salve.

## Deploy no Cloudflare Pages

Use estas configuracoes no projeto Pages:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (raiz do repositorio)

## Supabase

Antes de publicar para um novo cliente, crie um projeto Supabase separado, execute nele o SQL abaixo e informe as credenciais novas em `app.js`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PROJECT_ID`

Para ativar a sincronizacao em nuvem, execute no SQL Editor:

- `supabase/schema.sql`

Os scripts que alteram dados exigem `SUPABASE_URL` e `SUPABASE_ANON_KEY` como variaveis de ambiente; eles nao possuem mais acesso padrao ao projeto anterior.

## Logins de teste

- Admin: `admin` / `admin`
- Garcom: `user` / `user`
- Cozinheiro: `cook` / `cook`
