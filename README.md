# Sistema de Ordens de Serviço - MBM Copy (CRIADO JUNTO COM IA E FEITO PARA ESTUDOS)

Este README explica, de forma simples e com exemplos, como o backend do projeto está organizado. O objetivo é ajudar quem não conhece JavaScript a entender rotas, middlewares e controllers.

## Estrutura principal

- `server.js` - inicializa o servidor, configura middlewares globais e registra as rotas.
- `routes/` - define URLs (endpoints) e conecta com os controllers.
- `controllers/` - contém a lógica das rotas: recebem requisições, chamam models e retornam views/respostas.
- `models/` - funções que acessam o banco de dados (consultas SQL). Retornam dados para os controllers.
- `middlewares/` - funções que executam lógica antes das rotas (ex.: verificação de autenticação, upload de arquivos).
- `utils/` - utilitários (ex.: enviar e-mails, gerar Excel).
- `config/db.js` - configuração do pool de conexões com MySQL.

