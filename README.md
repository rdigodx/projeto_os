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

projeto-os/
|
├── server.js               # Arquivo principal (inicializa servidor e rotas)
├── package.json            # Configurações do Node
├── .env                    # Variáveis de ambiente (senha do BD, e-mail, etc)
│
├── config/
│   └── db.js               # Conexão com MySQL
|
|
├── logs/ 
│   ├── app.log
|   ├── auditoria.log
|   └── error.log             # Logs do servidor    
│
├── routes/                 # Rotas da aplicação
│   ├── indexRoutes.js      # Rotas públicas (/ e /nova-os)
│   ├── loginRoutes.js       # Rotas de login/logout
│   ├── painelRoutes.js     # Rotas do painel técnico
│   ├── osRoutes.js         # Rotas para OS (fechar, anexos, etc)
|   ├── sucessoRoutes.js    # Rota de sucesso
│   └── relatorioRoutes.js  # Relatórios mensais
│
├── controllers/            # Lógica das rotas
│   ├── indexController.js
│   ├── loginController.js
│   ├── painelController.js
│   ├── osController.js
|   ├── sucessoController.js 
│   └── relatorioController.js
│
├── models/                 # Queries SQL
│   ├── usuarioModel.js
│   ├── tecnicoModel.js
│   ├── ordemModel.js
│   └── anexoModel.js
│
├── middlewares/            # Funções intermediárias
│   ├── authMiddleware.js   
│   └── uploadMiddleware.js 
│
├── utils/                  # Funções auxiliares
│   ├── email.js            
│   ├── excel.js  
|   └── logger.js                  
│
├── views/                  # Páginas (EJS ou HTML adaptado)
│   ├── index.ejs
│   ├── nova_os.ejs
│   ├── sucesso.ejs
│   ├── login.ejs
│   ├── painel.ejs
|   ├── 404.ejs
|   ├── error.ejs
|   └── partials
|        ├── alerts.ejs
|        └── messages.ejs
|
|
│
├── public/                 # Arquivos estáticos
│   ├── css/
│   │   ├── style.css
│   │   ├── painel.css
|   |   ├── login.css
|   |   ├── sucesso.css
|   |   └── nova_os.css
|   |
|   ├── images/
|   |   ├── background.jpg
|   |   └── logo.png
|   |
│   └── js/
|       ├── indexScripts.js
|       ├── painelScripts.js
|       ├── loginScripts.js
|       ├── sucessoScripts.js
|       └── nova_osScripts.js
│
├── uploads/                # Arquivos enviados nas OS
└── reports/                # Relatórios gerados em Excel

