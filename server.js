// Carrega variáveis do arquivo .env
require('dotenv').config();

// Importações principais
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const favicon = require('serve-favicon');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

// ------------------- MIDDLEWARES -------------------

// Segurança de cabeçalhos HTTP (APENAS EM PRODUÇÃO)
if (isProduction) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://code.jquery.com',
            'https://cdn.datatables.net',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Necessário para alguns estilos inline
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.datatables.net',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        },
      },
    })
  );
}

// Logs de requisições
app.use(morgan('dev'));

// Servir arquivos estáticos (CSS, JS, imagens)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para favicon
app.use(favicon(path.join(__dirname, 'public', 'images', 'logo.png')));

// Parser de formulários (POST) e JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configura sessão do usuário
// O segredo da sessão agora é obrigatório (sem fallback)
app.use(session({
  secret: process.env.SECRET, 
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 dia
    secure: isProduction,
    sameSite: 'lax'
  }
}));

// Flash messages
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash(); // disponível em todos os templates
  next();
});

// Motor de visualização EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// ------------------- ROTAS -------------------
app.use('/', require('./routes/indexRoutes'));
// Rotas de autenticação
const authRoutes = require('./routes/loginRoutes');
app.use('/login', authRoutes);
app.get('/logout', authRoutes); // Reutiliza o mesmo roteador para a rota de logout
app.use('/painel', require('./routes/painelRoutes'));
app.use('/os', require('./routes/osRoutes'));

// Rota de sucesso agora usa um controller específico
const sucessoController = require('./controllers/sucessoController');
app.get('/sucesso', sucessoController.showSucesso);

app.use('/relatorio', require('./routes/relatorioRoutes'));

// ------------------- ERROS -------------------

// Página 404
app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

// Página 500
app.use((err, req, res, next) => {
  console.error(err.stack); // Sempre loga o erro completo para depuração

  // Em produção, envia uma mensagem genérica para o usuário.
  if (isProduction) {
    res.status(500).render('error', { error: 'Ocorreu um erro interno do servidor.' });
  } else {
    // Em desenvolvimento, exibe a mensagem de erro detalhada.
    res.status(500).render('error', { error: err.message });
  }
});

// ------------------- SERVIDOR -------------------
app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  if (!process.env.SECRET) {
    console.warn('⚠️ AVISO: A variável de ambiente "SECRET" não está definida. A sessão não será segura em produção.');
  }
});