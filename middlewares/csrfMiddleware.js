const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CSRF_SESSION_KEY = 'csrfToken';

const generateToken = () => crypto.randomBytes(32).toString('hex');

const issueCsrfToken = (req) => {
  const token = generateToken();
  req.session[CSRF_SESSION_KEY] = token;
  return token;
};

exports.attachCsrfToken = (req, res, next) => {
  if (!req.session) {
    return next(new Error('Sessao nao inicializada para CSRF.'));
  }

  if (!req.session[CSRF_SESSION_KEY]) {
    issueCsrfToken(req);
  }

  res.locals.csrfToken = req.session[CSRF_SESSION_KEY];
  return next();
};

exports.verifyCsrfToken = (req, res, next) => {
  const sessionToken = req.session && req.session[CSRF_SESSION_KEY];
  const requestToken = (req.body && req.body._csrf) || req.headers['x-csrf-token'];

  if (sessionToken && requestToken && sessionToken === requestToken) {
    return next();
  }

  // Se houver upload multipart já processado, remove os arquivos para evitar lixo em disco.
  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      try {
        const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.filename));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        // Ignora erro de limpeza para não mascarar a resposta CSRF.
      }
    }
  }

  if (req.flash) {
    req.flash('danger', 'Sessao expirada ou token de seguranca invalido. Tente novamente.');
  }

  if (req.accepts('json') && !req.accepts('html')) {
    return res.status(403).json({ error: 'Token CSRF invalido.' });
  }

  const backUrl = req.get('referer') || '/';
  return res.status(403).redirect(backUrl);
};

exports.issueCsrfToken = issueCsrfToken;
