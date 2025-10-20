# Sistema de Ordens de Serviço - MBM Copy

Este README explica, de forma simples e com exemplos, como o backend do projeto está organizado. O objetivo é ajudar quem não conhece JavaScript a entender rotas, middlewares e controllers.

## Estrutura principal

- `server.js` - inicializa o servidor, configura middlewares globais e registra as rotas.
- `routes/` - define URLs (endpoints) e conecta com os controllers.
- `controllers/` - contém a lógica das rotas: recebem requisições, chamam models e retornam views/respostas.
- `models/` - funções que acessam o banco de dados (consultas SQL). Retornam dados para os controllers.
- `middlewares/` - funções que executam lógica antes das rotas (ex.: verificação de autenticação, upload de arquivos).
- `utils/` - utilitários (ex.: enviar e-mails, gerar Excel).
- `config/db.js` - configuração do pool de conexões com MySQL.

## Como as rotas funcionam (resumo simples)

Uma rota é um "endereço" que o navegador ou um formulário usa para falar com o servidor. Exemplo: `GET /nova-os` mostra o formulário para abrir uma nova OS. `POST /nova-os` envia os dados do formulário para o servidor.

As rotas ficam em `routes/` e chamam funções do `controllers/`:

- `routes/indexRoutes.js`:
  - `GET /` -> chama `indexController.index` (mostra a página inicial)
  - `GET /nova-os` -> exibe formulário de abertura de OS
  - `POST /nova-os` -> envia os dados e chama `indexController.novaOs`
  - `GET /sucesso` -> página que confirma criação da OS

- `routes/authRoutes.js`:
  - `GET /login` -> mostra o formulário de login
  - `POST /login` -> processa o login com `authController.login`
  - `GET /logout` -> encerra a sessão com `authController.logout`

- `routes/painelRoutes.js`:
  - `GET /painel` -> exige login (middleware `isAuth`) e chama `painelController.index` para mostrar o painel técnico

- `routes/osRoutes.js`:
  - `POST /os/criar` -> cria OS com anexos (usa `uploadMiddleware` para lidar com arquivos)
  - `POST /os/fechar/:id` -> fecha a OS com id informado (requisição de técnico autenticado)
  - `GET /os/baixar-anexo/:arquivoId` -> baixa arquivo anexo
  - `POST /os/editar/:id` -> edita OS
  - `POST /os/excluir/:id` -> exclui OS

- `routes/relatorioRoutes.js`:
  - `POST /relatorio` -> gera e envia um relatório Excel (apenas técnicos)


## O que é um controller e como ele funciona (exemplo simples)

Controller = função que recebe a requisição (req) e responde (res). Ele faz passos parecidos com:
1. Ler dados da requisição (ex.: `req.body.nome`)
2. Validar ou transformar esses dados
3. Chamar o model (ex.: `UsuarioModel.findByNome(nome)`) para acessar o banco
4. Fazer algo com o resultado (criar registro, enviar email)
5. Retornar uma view ou redirecionar (ex.: `res.render('sucesso', { token })`)

Exemplo de uso (abrir OS):
- Usuário preenche formulário e envia `POST /nova-os`
- `indexController.novaOs` recebe os dados, chama `UsuarioModel` e `OrdemModel` para criar registros
- Se tudo ok, renderiza `sucesso.ejs` mostrando o token da OS

## Middlewares (o que fazem e exemplos)

Middlewares são funções executadas antes de chegar no controller. Exemplos:

- `authMiddleware.isAuth` - verifica se existe `req.session.tecnico`. Se não existir, redireciona para `/login`.
  - Uso: `router.get('/painel', isAuth, painelController.index)` (isAuth roda antes de painelController.index)

- `uploadMiddleware` (Multer) - processa uploads de arquivos em formulários multipart/form-data.
  - Uso: `router.post('/os/criar', upload.array('anexos', 5), osController.criarOs)`
  - Explicação simples: aceita até 5 arquivos no campo `name="anexos"` e salva na pasta `uploads/`.

## Models (consulta ao banco)

Models são funções que retornam dados do banco. Exemplos:

- `UsuarioModel.findByNome(nome)` - retorna `undefined` ou um objeto com os dados do usuário.
- `OrdemModel.create({ solicitante_id, setor, tipo_servico, descricao })` - cria uma OS e retorna `{ id, token }`.

Exemplo simples: `const usuario = await UsuarioModel.findByNome('Ana'); if (!usuario) { await UsuarioModel.create({ nome: 'Ana', email: 'ana@x.com' }) }`

## Como testar manualmente (passo a passo)

1. Instale dependências e execute o servidor:

```bash
# no Windows PowerShell
npm install
npm run dev
```

2. No navegador, abra `http://localhost:3000` para acessar a página inicial.
3. Para abrir uma OS:
   - Acesse `http://localhost:3000/nova-os`
   - Preencha o formulário e envie.
4. Para acessar o painel (módulo técnico): faça login em `/login` com um técnico cadastrado.
5. Para gerar relatório: no painel, use o formulário de relatórios que envia `POST /relatorio`.

## Observações importantes

- O README fornece um resumo funcional. Para entender detalhes, leia os comentários adicionados diretamente nos arquivos do backend (cada função e arquivo tem explicações simples e exemplos).
- Variáveis sensíveis (senha do banco, credenciais de e-mail) estão em `.env` — não as comite em repositórios públicos.

---

Se quiser, eu posso também:
- Gerar exemplos `curl` para cada rota `POST` (com payloads JSON/form-data).
- Comentar os arquivos front-end (`public/js`) e as views EJS.
- Adicionar uma seção de troubleshooting com erros comuns e como corrigi-los.

Diga qual próximo passo prefere.