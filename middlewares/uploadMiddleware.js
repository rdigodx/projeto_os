// Middleware de upload usando Multer
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configura onde os arquivos serão salvos e como serão nomeados
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pasta 'uploads' na raiz do projeto
    const dir = path.join(__dirname, '..', 'uploads');
    // Cria a pasta caso não exista
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Gera nome único para evitar sobrescrita (timestamp + número aleatório + extensão)
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Filtra tipos de arquivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    // Permite o arquivo
    cb(null, true);
  } else {
    // Rejeita com erro explicativo
    cb(new Error('Tipo de arquivo não suportado. Apenas PDF, imagens e documentos são permitidos.'), false);
  }
};

// Cria o middleware Multer com limites de tamanho de arquivo (10MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Exporta o middleware para ser usado nas rotas (ex: upload.array('anexos', 5))
module.exports = upload;