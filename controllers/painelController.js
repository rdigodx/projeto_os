const OrdemModel = require('../models/ordemModel');
const AnexoModel = require('../models/anexoModel');

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const ALLOWED_STATUS = new Set(['nova', 'pendente', 'concluida', 'fora_prazo']);
const ALLOWED_PRIORIDADE = new Set(['baixa', 'media', 'alta', 'critica']);
const ALLOWED_SLA = new Set(['no_prazo', 'vence_hoje', 'estourado']);
const ALLOWED_SORT = new Set(['id', 'data', 'status', 'prioridade', 'prazo', 'solicitante', 'setor', 'tipo', 'tecnico']);
const ALLOWED_DIR = new Set(['asc', 'desc']);

const SCRIPT_ESCAPE_MAP = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

const serializeForScript = (value) =>
  JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => SCRIPT_ESCAPE_MAP[char] || char);

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const mapFiltroToStatus = (filtro) => {
  switch (filtro) {
    case 'novas':
      return 'nova';
    case 'pendentes':
      return 'pendente';
    case 'concluidas':
      return 'concluida';
    case 'fora_prazo':
      return 'fora_prazo';
    default:
      return '';
  }
};

exports.painel = async (req, res, next) => {
  if (!req.session.tecnico) {
    return res.redirect('/login');
  }

  try {
    await OrdemModel.updateStatusNovaParaPendente();

    const filtro = req.query.filtro || null;
    const pageSizeFromQuery = toPositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE);
    const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeFromQuery) ? pageSizeFromQuery : DEFAULT_PAGE_SIZE;
    const requestedPage = toPositiveInt(req.query.page, 1);
    const statusFromFiltro = mapFiltroToStatus(filtro);
    const statusFromQuery = String(req.query.status || '').trim();
    const status = ALLOWED_STATUS.has(statusFromQuery)
      ? statusFromQuery
      : (ALLOWED_STATUS.has(statusFromFiltro) ? statusFromFiltro : '');
    const prioridadeCandidate = String(req.query.prioridade || '').trim();
    const prioridade = ALLOWED_PRIORIDADE.has(prioridadeCandidate) ? prioridadeCandidate : '';
    const slaCandidate = String(req.query.sla || '').trim();
    const sla = ALLOWED_SLA.has(slaCandidate) ? slaCandidate : '';
    const sortCandidate = String(req.query.sort || 'data').trim();
    const sort = ALLOWED_SORT.has(sortCandidate) ? sortCandidate : 'data';
    const dirCandidate = String(req.query.dir || 'desc').trim().toLowerCase();
    const dir = ALLOWED_DIR.has(dirCandidate) ? dirCandidate : 'desc';
    const search = String(req.query.q || '').trim().slice(0, 120);

    let page = requestedPage;
    let paged = await OrdemModel.findPaged({
      page,
      pageSize,
      status,
      prioridade,
      sla,
      search,
      sort,
      dir,
    });

    const totalPagesRaw = Math.max(1, Math.ceil(paged.total / pageSize));
    if (page > totalPagesRaw && paged.total > 0) {
      page = totalPagesRaw;
      paged = await OrdemModel.findPaged({
        page,
        pageSize,
        status,
        prioridade,
        sla,
        search,
        sort,
        dir,
      });
    }

    const ordens = paged.rows;
    const total = paged.total;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const fim = total === 0 ? 0 : inicio + ordens.length - 1;

    const osIds = ordens.map((os) => os.id);
    const anexos = await AnexoModel.findByOsIds(osIds);
    const anexosPorOs = new Map();

    for (const anexo of anexos) {
      if (!anexosPorOs.has(anexo.os_id)) {
        anexosPorOs.set(anexo.os_id, []);
      }
      anexosPorOs.get(anexo.os_id).push(anexo);
    }

    for (const os of ordens) {
      os.anexos = anexosPorOs.get(os.id) || [];
    }

    const [
      qtd_nova,
      qtd_pendente,
      qtd_concluida,
      qtd_fora_prazo,
      qtd_total,
      usuario_top,
      usuarios_top5,
    ] = await Promise.all([
      OrdemModel.countByStatus('Nova'),
      OrdemModel.countByStatus('Pendente'),
      OrdemModel.countByStatus('Concluída'),
      OrdemModel.countForaPrazo(),
      OrdemModel.countAll(),
      OrdemModel.findUsuarioTop(),
      OrdemModel.findUsuariosTop5(),
    ]);

    return res.render('painel', {
      ordens,
      qtd_nova,
      qtd_pendente,
      qtd_concluida,
      qtd_fora_prazo,
      qtd_total,
      usuario_top,
      usuarios_top5,
      usuarios_top5_json: serializeForScript(usuarios_top5 || []),
      ordens_json: serializeForScript(ordens || []),
      tecnico: req.session.tecnico,
      mes_atual: new Date().getMonth() + 1,
      ano_atual: new Date().getFullYear(),
      table_query: {
        q: search,
        status,
        prioridade,
        sla,
        sort,
        dir,
        page,
        pageSize,
      },
      table_meta: {
        total,
        totalPages,
        inicio,
        fim,
      },
      page_size_options: PAGE_SIZE_OPTIONS,
    });
  } catch (err) {
    return next(err);
  }
};
