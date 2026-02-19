require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const helmet = require('helmet');
const favicon = require('serve-favicon');
const { logger } = require('./utils/logger');
const { attachCsrfToken } = require('./middlewares/csrfMiddleware');
const { createSessionStore } = require('./config/sessionStore');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT || 5000);
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SECRET || 'dev-only-secret-change-me';
const sessionCookieName = 'os.sid';
const { mode: sessionStoreMode, store: sessionStore } = createSessionStore({ isProduction });

if (!process.env.SECRET) {
  logger.warn('Variavel SECRET nao definida. Configure um valor forte no .env.');
  if (isProduction) {
    throw new Error('A variavel de ambiente SECRET e obrigatoria em producao.');
  }
}

if (isProduction && sessionStoreMode === 'memory') {
  logger.warn('SESSION_STORE=memory em producao. Recomenda-se SESSION_STORE=mysql para persistencia.');
}

if (sessionStoreMode === 'mysql' && typeof sessionStore.ready === 'function') {
  sessionStore.ready().catch((err) => {
    logger.error('Falha ao inicializar tabela de sessao MySQL:', err);
    if (isProduction) {
      process.exit(1);
    }
  });
}

if (process.env.TRUST_PROXY === 'true' || isProduction) {
  app.set('trust proxy', 1);
}

app.use((req, res, next) => {
  const serviceName = process.env.SERVICE_NAME || 'os-service';
  logger.info(`HTTP ${req.method} ${req.url}`, {
    ip: req.ip,
    service: serviceName,
    userAgent: req.get('User-Agent'),
  });
  next();
});

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

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
            'https://unpkg.com',
            (req, res) => `'nonce-${res.locals.cspNonce}'`,
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdnjs.cloudflare.com',
            'https://cdn.datatables.net',
            'https://unpkg.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        },
      },
    })
  );
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'logo.png')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    name: sessionCookieName,
    secret: sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: isProduction,
      sameSite: 'lax',
    },
  })
);

app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use(attachCsrfToken);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/', require('./routes/indexRoutes'));
const authRoutes = require('./routes/loginRoutes');
app.use('/login', authRoutes);
const loginController = require('./controllers/loginController');
app.get('/logout', loginController.logout);
app.use('/painel', require('./routes/painelRoutes'));
app.use('/os', require('./routes/osRoutes'));

const sucessoController = require('./controllers/sucessoController');
app.get('/sucesso', sucessoController.showSucesso);
app.use('/relatorio', require('./routes/relatorioRoutes'));

if (process.env.NODE_ENV === 'test') {
  const { isAuth } = require('./middlewares/authMiddleware');
  app.get('/_test/auth-check', isAuth, (req, res) => {
    res.status(204).end();
  });
}

app.use((req, res) => {
  res.status(404).render('404', { url: req.originalUrl });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);

  if (isProduction) {
    return res.status(500).render('error', { error: 'Ocorreu um erro interno do servidor.' });
  }

  return res.status(500).render('error', { error: err.message });
});

const bindServerErrorHandler = (server, port) => {
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    if (error.code === 'EADDRINUSE') {
      logger.error(`A porta ${port} ja esta em uso. Verifique outra instancia em execucao.`);
      process.exit(1);
    }
    throw error;
  });
};

const startServer = (options = {}) => {
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;

  const server = app.listen(port, host, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    logger.info(`Servidor rodando em ${host}:${actualPort}`);
  });

  bindServerErrorHandler(server, port);
  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
  sessionStore,
  sessionStoreMode,
  sessionSecret,
  sessionCookieName,
};
