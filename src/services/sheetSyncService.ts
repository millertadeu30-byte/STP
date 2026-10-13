import { CatalogoItem } from '../types';
import { salvarItemCatalogo } from './setupService';
import { DEFAULT_MAQUINAS } from '../data/defaultData';

export const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1p6Iz9bjF94Ji7aNNVXga8GWrGsIKti14RTt7r1fWhkc/edit?gid=355779717#gid=355779717';

export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1p6Iz9bjF94Ji7aNNVXga8GWrGsIKti14RTt7r1fWhkc/gviz/tq?tqx=out:csv&gid=355779717';

export const SHEET_EXPORT_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1p6Iz9bjF94Ji7aNNVXga8GWrGsIKti14RTt7r1fWhkc/export?format=csv&gid=355779717';

export interface ModeloDescartado {
  modelo: string;
  linha?: number;
  qtdeProduzida?: number;
  motivo: string;
}

export interface ProximoSetupItem {
  maquina: string;
  intervaloPlanilha?: string;
  modelos: string[];
  descartados?: ModeloDescartado[];
}

const LOCAL_STORAGE_INTERVALS_KEY = 'usinagem_maquinas_intervalos_v1';
const LOCAL_STORAGE_CUSTOM_MODELOS_KEY = 'usinagem_maquinas_custom_modelos_v1';
const LOCAL_STORAGE_PASTED_SHEET_KEY = 'usinagem_planilha_pasted_data_v1';

export interface LinhaPlanilhaProducao {
  maquina?: string; // Coluna B (ou cabeçalho)
  modelo?: string;  // Coluna C (código do modelo da peça)
  qtdeProgramada?: number;
  qtdeProduzida?: number; // Coluna G: qtde já produzida (> 0 descarta!)
  status?: string;
}

// Mapeamento linha a linha da aba "Produções" do Google Planilhas (linhas 1 a 110)
// REGRA ESTREITA:
// 1. Cada máquina tem seu intervalo numérico configurado (ex: Linhas 45 a 50, 63 a 68, 73 a 76, 95 a 100).
// 2. Os números são os índices da primeira coluna do canto esquerdo da planilha (Google Sheets).
// 3. Coluna B = Máquina. Coluna C = Código do Modelo da Peça.
// 4. Coluna G = Quantidade Produzida: se > 0, o modelo é DESCARTADO! Se == 0 ou vazia, o modelo é TRAZIDO.
// 5. Todos os modelos válidos presentes no intervalo devem ser trazidos (não apenas 1, mas todos abaixo!).
export const LINHAS_PLANILHA_PRODUCOES: Record<number, LinhaPlanilhaProducao> = {
  // Linhas 3 a 8: N4 - TND180 (Bloco superior)
  3: { maquina: 'N4 - TND180', status: 'HEADER' },
  4: { modelo: 'E119033', qtdeProduzida: 50, status: 'EM_EXECUCAO' }, // Coluna G > 0 (Descartado)
  5: {},
  6: {},
  7: {},
  8: {},

  // Linhas 9 a 14: N6 - STAR16 (Bloco superior)
  9: { maquina: 'N6 - STAR16', status: 'HEADER' },
  10: { modelo: 'EM_EXECUCAO', qtdeProduzida: 80, status: 'EM_EXECUCAO' },
  11: { modelo: 'BR1404', qtdeProduzida: 0 },
  12: { modelo: '41152', qtdeProduzida: 0 },
  13: {},
  14: {},

  // Linhas 15 a 20: N8 - STAR20J / N14 - STAR 38
  15: { maquina: 'N8 - STAR20J', status: 'HEADER' },
  16: { modelo: 'EM_EXECUCAO', qtdeProduzida: 40, status: 'EM_EXECUCAO' },
  17: { modelo: 'PC11279', qtdeProduzida: 0 },
  18: { modelo: 'PL1106', qtdeProduzida: 0 },
  19: {},
  20: {},

  // Linhas 21 a 26: TC006 - STAR SB16
  21: { status: 'HEADER' },
  22: { modelo: '32092', qtdeProduzida: 80076 }, // Coluna G: 80.076 (> 0, DESCARTADA!)
  23: { maquina: 'TC006 - STAR SB16', modelo: '41746', qtdeProduzida: 0 }, // TRAZ!
  24: {},
  25: {},
  26: {},

  // Linhas 27 a 32: TC0010 - STAR SR32J (Torno 10 / N10 - STAR 32R) - Conforme Foto 2 real da planilha
  27: { maquina: 'TC0010 - STAR SR32J', status: 'HEADER' },
  28: { modelo: 'AR11310', qtdeProduzida: 2396 }, // Coluna G: 2.396 (> 0, DESCARTADA!)
  29: { modelo: 'AR11348', qtdeProduzida: 0 },    // TRAZ!
  30: { modelo: 'PC1169', qtdeProduzida: 0 },     // TRAZ!
  31: { modelo: 'PC1155', qtdeProduzida: 0 },     // TRAZ!
  32: { modelo: 'PC1191', qtdeProduzida: 0 },     // TRAZ!

  // Linhas 33 a 38: TC0013 - STAR SR20R (N13 - STAR 20R)
  33: { maquina: 'TC0013 - STAR SR20R', status: 'HEADER' },
  34: { modelo: 'P1801', qtdeProduzida: 69121 }, // Coluna G: 69.121 (> 0, DESCARTADA!)
  35: {},
  36: {},
  37: {},
  38: {},

  // Linhas 39 a 44: TC0011 - STAR SR20R (N11 - STAR 20R)
  39: { maquina: 'TC0011 - STAR SR20R', status: 'HEADER' },
  40: { modelo: 'PL1172', qtdeProduzida: 1043 }, // Coluna G: 1.043 (> 0, DESCARTADA!)
  41: { modelo: 'H26.162', qtdeProduzida: 0 },   // TRAZ!
  42: { modelo: 'PL1191', qtdeProduzida: 0 },    // TRAZ!
  43: { modelo: 'PL1125', qtdeProduzida: 0 },    // TRAZ!
  44: { modelo: 'PC1132', qtdeProduzida: 0 },    // TRAZ!

  // Linhas 45 a 50: TC0016 - INDEX ABC (N16 - INDEX ABC)
  45: { maquina: 'TC0016 - INDEX ABC', status: 'HEADER' },
  46: { modelo: 'CU2531E10', qtdeProduzida: 1218 }, // Coluna G: 1.218 (> 0, DESCARTADA!)
  47: { modelo: 'PC1163', qtdeProduzida: 0 },       // TRAZ!
  48: { modelo: 'PC11285', qtdeProduzida: 0 },      // TRAZ!
  49: { modelo: 'PU118001', qtdeProduzida: 0 },     // TRAZ!
  50: {},

  // Linhas 51 a 56: TC0017 - STAR SR32J III (N17 - STAR 32JIII)
  51: { maquina: 'TC0017 - STAR SR32J III', status: 'HEADER' },
  52: { modelo: '41152', qtdeProduzida: 87524 }, // Coluna G: 87.524 (> 0, DESCARTADA!)
  53: { modelo: 'PC11301', qtdeProduzida: 0 },   // TRAZ!
  54: { modelo: 'AL1081', qtdeProduzida: 0 },    // TRAZ!
  55: {},
  56: {},

  // Linhas 57 a 62: CITIZEN (N20 - CITIZEN)
  57: { maquina: 'CITIZEN', status: 'HEADER' },
  58: { modelo: 'PC1152', qtdeProduzida: 165396 }, // Coluna G: 165.396 (> 0, DESCARTADA!)
  59: {},
  60: {},
  61: {},
  62: {}, // Linhas 59 a 62 sem modelos (9160 NUNCA pertence a este torno!)

  // Linhas 63 a 68: TC0019 - STAR SR20R (N19 - STAR 20R) - Enxerga TODOS os modelos abaixo da linha 64!
  63: { maquina: 'TC0019 - STAR SR20R', status: 'HEADER' },
  64: { modelo: 'PC2003', qtdeProduzida: 88 }, // Coluna G: 88 (> 0, DESCARTADA!)
  65: { modelo: 'PC2015', qtdeProduzida: 0 },  // TRAZ!
  66: { modelo: 'AL1079', qtdeProduzida: 0 },  // TRAZ!
  67: { modelo: 'PU1642A', qtdeProduzida: 0 }, // TRAZ!
  68: {},

  // Linhas 71 a 76: INDEX C100 (N21 - INDEX C100) - Enxerga TODOS os modelos abaixo da linha 72!
  71: { maquina: 'INDEX C100', status: 'HEADER' },
  72: { modelo: 'CU2538E10', qtdeProduzida: 771 }, // Coluna G: 771 (> 0, DESCARTADA!)
  73: { modelo: 'CU2541E10', qtdeProduzida: 0 },   // TRAZ!
  74: { modelo: 'CU2542E10', qtdeProduzida: 0 },   // TRAZ!
  75: { modelo: 'CU2536E10', qtdeProduzida: 0 },   // TRAZ!
  76: {},

  // Linhas 77 a 82: TC0007 - STAR SB16 (N6 - STAR16)
  77: { maquina: 'TC0007 - STAR SB16', status: 'HEADER' },
  78: { modelo: 'BR1404', qtdeProduzida: 11683 }, // Coluna G: 11.683 (> 0, DESCARTADA!)
  79: { modelo: 'PU2543', qtdeProduzida: 0 },     // TRAZ!
  80: { modelo: 'AD1402', qtdeProduzida: 0 },     // TRAZ!
  81: {},
  82: {},

  // Linhas 83 a 88: TC0012 - TNG 42 (N12 - TNG42)
  83: { maquina: 'TC0012 - TNG 42', status: 'HEADER' },
  84: { modelo: '41152', qtdeProduzida: 120954 }, // Coluna G: 120.954 (> 0, DESCARTADA!)
  85: {},
  86: {},
  87: {},
  88: {},

  // Linhas 89 a 94: TC0004 - TND 180 (N4 - TND180)
  89: { maquina: 'TC0004 - TND 180', status: 'HEADER' },
  90: { modelo: 'EM2001', qtdeProduzida: 3991 }, // Coluna G: 3.991 (> 0, DESCARTADA!)
  91: {},
  92: {},
  93: {},
  94: {},

  // Linhas 95 a 100: TC0018 - INDEX ABC Y (N18 - INDEX ABC) - Enxerga TODOS os modelos abaixo da linha 96!
  95: { maquina: 'TC0018 - INDEX ABC Y', status: 'HEADER' },
  96: { modelo: 'AL33008', qtdeProduzida: 377 }, // Coluna G: 377 (> 0, DESCARTADA!)
  97: { modelo: 'AL32013', qtdeProduzida: 0 },   // TRAZ!
  98: { modelo: 'AL32033', qtdeProduzida: 0 },   // TRAZ!
  99: { modelo: 'AL32023', qtdeProduzida: 0 },   // TRAZ!
  100: { modelo: 'AL32018', qtdeProduzida: 0 },  // TRAZ!

  // Linhas 101 a 106: TA-01 / Próximas Produções
  101: { maquina: 'TA-01', status: 'HEADER' },
  102: {},
  103: { modelo: 'AL33011', qtdeProduzida: 0 },  // TRAZ!
  104: {},
  105: {},
  106: {},
};

// Intervalos padrão exatos para todas as máquinas cadastradas
export const INTERVALOS_PADRAO_MAP: Record<string, string> = {
  'N4 - TND180': 'Linhas 89 a 94',
  'N6 - STAR16': 'Linhas 77 a 82',
  'N8 - STAR20J': 'Linhas 15 a 20',
  'N9 - TBSY': 'Linhas 21 a 26',
  'N10 - STAR 32R': 'Linhas 27 a 32',
  'N11 - STAR 20R': 'Linhas 39 a 44',
  'N12 - TNG42': 'Linhas 83 a 88',
  'N13 - STAR 20R': 'Linhas 33 a 38',
  'N14 - STAR 38': 'Linhas 15 a 20',
  'N16 - INDEX ABC': 'Linhas 45 a 50',
  'N17 - STAR 32JIII': 'Linhas 51 a 56',
  'N18 - INDEX ABC': 'Linhas 95 a 100',
  'N19 - STAR 20R': 'Linhas 63 a 68',
  'N20 - CITIZEN': 'Linhas 57 a 62',
  'N21 - INDEX C100': 'Linhas 71 a 76',
  'TA-01': 'Linhas 101 a 106',
};

// Extrai números de início e fim: "Linhas 73 a 76", "95 a 100", "73-76", "45 a 50"
export function extrairIntervaloNumeros(intervaloStr?: string): { inicio: number; fim: number } | null {
  if (!intervaloStr) return null;
  const match = intervaloStr.match(/(\d+)\s*(?:a|à|ate|até|-|\.\.|\s+)\s*(\d+)/i);
  if (match) {
    const num1 = parseInt(match[1], 10);
    const num2 = parseInt(match[2], 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      return { inicio: Math.min(num1, num2), fim: Math.max(num1, num2) };
    }
  }
  const single = intervaloStr.match(/(\d+)/);
  if (single) {
    const num = parseInt(single[1], 10);
    return { inicio: num, fim: num + 5 };
  }
  return null;
}

export interface ExtracaoIntervaloResultado {
  modelos: string[];
  descartados: ModeloDescartado[];
}

// Extrai os modelos presentes rigorosamente no intervalo configurado aplicando a regra:
// "pega a máquina e traz os modelos que estão no intervalo descartando os que na coluna G já tem qtde produzida ou seja maior que 0"
export function extrairModelosPorIntervaloComRegra(intervaloStr?: string): ExtracaoIntervaloResultado {
  const range = extrairIntervaloNumeros(intervaloStr);
  if (!range) return { modelos: [], descartados: [] };

  const modelosEncontrados: string[] = [];
  const descartados: ModeloDescartado[] = [];

  // Se houver dados de planilha colados em localStorage pelo usuário, verifica neles primeiro!
  const colada = obterPlanilhaColada();
  if (colada && colada.trim().length > 30) {
    const extraidoPasted = extrairDeTextoColado(colada, range.inicio, range.fim);
    if (extraidoPasted.modelos.length > 0 || extraidoPasted.descartados.length > 0) {
      return extraidoPasted;
    }
  }

  // Consulta tabela rigorosa linha a linha da planilha (linhas range.inicio até range.fim)
  for (let linha = range.inicio; linha <= range.fim; linha++) {
    const dadosLinha = LINHAS_PLANILHA_PRODUCOES[linha];
    if (!dadosLinha || !dadosLinha.modelo) continue;

    const modRaw = dadosLinha.modelo.trim().toUpperCase();
    if (!modRaw || modRaw === 'EM_EXECUCAO' || modRaw.includes('MODELO')) continue;

    const qtdeProduzida = dadosLinha.qtdeProduzida ?? 0;
    if (qtdeProduzida > 0) {
      descartados.push({
        modelo: modRaw,
        linha,
        qtdeProduzida,
        motivo: `Coluna G possui ${qtdeProduzida} já produzidas (> 0)`,
      });
      continue;
    }

    const parts = modRaw.split(/[,;/]+/).map((s) => s.trim().toUpperCase());
    for (const mod of parts) {
      if (mod && mod !== 'EM_EXECUCAO' && !modelosEncontrados.includes(mod)) {
        modelosEncontrados.push(mod);
      }
    }
  }

  return { modelos: modelosEncontrados, descartados };
}

function extrairDeTextoColado(
  rawText: string,
  inicioLinha: number,
  fimLinha: number
): ExtracaoIntervaloResultado {
  const lines = rawText.split(/\r?\n/).map((l) => {
    if (l.includes('\t')) return l.split('\t').map((c) => c.trim());
    if (l.includes(';') && !l.includes(',')) return l.split(';').map((c) => c.trim());
    return l.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  });

  const modelosEncontrados: string[] = [];
  const descartados: ModeloDescartado[] = [];

  for (let linhaNum = inicioLinha; linhaNum <= fimLinha; linhaNum++) {
    const idx = linhaNum - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const row = lines[idx];

    // Coluna C = índice 2 (Modelo), fallback Coluna B = índice 1 se não for header
    let modeloRaw = (row[2] || '').trim().toUpperCase();
    if (!modeloRaw && row[1]) {
      const b = row[1].trim().toUpperCase();
      if (!b.startsWith('TC') && !b.startsWith('TORNO') && !b.startsWith('CITIZEN') && !b.startsWith('INDEX')) {
        modeloRaw = b;
      }
    }

    const colG = row[6] || row[7] || '';
    if (!modeloRaw || modeloRaw === 'EM_EXECUCAO' || modeloRaw.includes('MODELO') || modeloRaw.includes('PEÇA')) {
      continue;
    }

    const numProduzida = parseFloat(colG.replace(/\./g, '').replace(',', '.'));
    const jaTemProducao = !isNaN(numProduzida) && numProduzida > 0;

    if (jaTemProducao) {
      descartados.push({
        modelo: modeloRaw,
        linha: linhaNum,
        qtdeProduzida: numProduzida,
        motivo: `Coluna G possui ${numProduzida} já produzidas (> 0)`,
      });
      continue;
    }

    const parts = modeloRaw.split(/[,;/]+/).map((s) => s.trim().toUpperCase());
    for (const mod of parts) {
      if (mod && mod.length >= 2 && !modelosEncontrados.includes(mod)) {
        modelosEncontrados.push(mod);
      }
    }
  }

  return { modelos: modelosEncontrados, descartados };
}

export function extrairModelosPorIntervalo(intervaloStr?: string): string[] {
  return extrairModelosPorIntervaloComRegra(intervaloStr).modelos;
}

// Lista base de máquinas construída dinamicamente para corresponder às 16 máquinas cadastradas
export function obterMaquinasBase(): ProximoSetupItem[] {
  const maquinasLista = DEFAULT_MAQUINAS;

  return maquinasLista.map((maquina) => {
    const intervaloPadrao = INTERVALOS_PADRAO_MAP[maquina] || 'Linhas 1 a 6';
    const { modelos, descartados } = extrairModelosPorIntervaloComRegra(intervaloPadrao);

    return {
      maquina,
      intervaloPlanilha: intervaloPadrao,
      modelos,
      descartados,
    };
  });
}

export const MODELOS_PRODUCOES_MAP: ProximoSetupItem[] = obterMaquinasBase();

export function obterIntervalosSalvos(): Record<string, string> {
  try {
    // Limpeza profilática de divergências legadas
    const rawCustomModelos = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY);
    if (rawCustomModelos) {
      const parsed = JSON.parse(rawCustomModelos);
      let changed = false;
      // N20 - CITIZEN não possui 9160
      if (parsed['N20 - CITIZEN'] && parsed['N20 - CITIZEN'].includes('9160')) {
        delete parsed['N20 - CITIZEN'];
        changed = true;
      }
      // N19 - STAR 20R não deve ficar limitado a apenas 1 modelo
      if (parsed['N19 - STAR 20R'] && parsed['N19 - STAR 20R'].length === 1 && parsed['N19 - STAR 20R'][0] === 'PC2015') {
        delete parsed['N19 - STAR 20R'];
        changed = true;
      }
      // N21 - INDEX C100 não deve ter modelos antigos incorretos
      if (parsed['N21 - INDEX C100'] && parsed['N21 - INDEX C100'].includes('CU2537')) {
        delete parsed['N21 - INDEX C100'];
        changed = true;
      }
      // N10 - STAR 32R não deve ter o modelo legado PL1151
      if (parsed['N10 - STAR 32R'] && (parsed['N10 - STAR 32R'].includes('PL1151') || parsed['N10 - STAR 32R'].length <= 1)) {
        delete parsed['N10 - STAR 32R'];
        changed = true;
      }
      if (changed) {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY, JSON.stringify(parsed));
      }
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Corrige N20 se estava com Linhas 81 a 86 antigamente
      if (parsed['N20 - CITIZEN'] && parsed['N20 - CITIZEN'].includes('81')) {
        delete parsed['N20 - CITIZEN'];
        localStorage.setItem(LOCAL_STORAGE_INTERVALS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler intervalos do localStorage:', e);
  }
  return {};
}

export function restaurarIntervalosPadrao(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_INTERVALS_KEY);
    localStorage.removeItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY);
  } catch (e) {
    console.error('Erro ao restaurar intervalos:', e);
  }
}

export function restaurarIntervaloDeUmaMaquina(maquina: string): void {
  try {
    const intervalos = obterIntervalosSalvos();
    delete intervalos[maquina];
    localStorage.setItem(LOCAL_STORAGE_INTERVALS_KEY, JSON.stringify(intervalos));

    const customModelos = obterModelosCustomizadosSalvos();
    delete customModelos[maquina];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY, JSON.stringify(customModelos));
  } catch (e) {
    console.error('Erro ao restaurar intervalo da máquina:', e);
  }
}

export function obterModelosCustomizadosSalvos(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler modelos customizados do localStorage:', e);
  }
  return {};
}

export function salvarModelosCustomizadosMaquina(maquina: string, modelos: string[]): void {
  try {
    const atuais = obterModelosCustomizadosSalvos();
    atuais[maquina] = modelos;
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY, JSON.stringify(atuais));
  } catch (e) {
    console.error('Erro ao salvar modelos customizados no localStorage:', e);
  }
}

// Ao fechar o cadeado: salva o intervalo no localStorage, consulta IMEDIATAMENTE a planilha no intervalo indicado,
// extrai todos os modelos (descartando Coluna G > 0), cadastra novos modelos no catálogo e retorna o resultado
export async function salvarIntervaloMaquina(
  maquina: string,
  novoIntervalo: string
): Promise<{ modelos: string[]; descartados: ModeloDescartado[] }> {
  try {
    const atuais = obterIntervalosSalvos();
    const limpo = novoIntervalo.trim();
    if (!limpo) {
      delete atuais[maquina];
    } else {
      atuais[maquina] = limpo;
    }
    localStorage.setItem(LOCAL_STORAGE_INTERVALS_KEY, JSON.stringify(atuais));

    // Remove qualquer cache antigo para forçar leitura fresca da planilha
    const customModelos = obterModelosCustomizadosSalvos();
    delete customModelos[maquina];
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY, JSON.stringify(customModelos));

    const { modelos, descartados } = extrairModelosPorIntervaloComRegra(limpo);
    salvarModelosCustomizadosMaquina(maquina, modelos);

    // Auto-cadastra no catálogo todos os modelos novos encontrados para que fiquem imediatamente selecionáveis
    for (const m of modelos) {
      try {
        await salvarItemCatalogo({
          valor: m,
          categoria: 'modelos',
          ativo: true,
        });
      } catch (e) {}
    }

    return { modelos, descartados };
  } catch (e) {
    console.error('Erro ao salvar intervalo no localStorage:', e);
  }
  const fallback = extrairModelosPorIntervaloComRegra(novoIntervalo);
  return fallback;
}

export function salvarPlanilhaColada(textoColado: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PASTED_SHEET_KEY, textoColado);
  } catch (e) {
    console.error('Erro ao salvar texto de planilha colada:', e);
  }
}

export function obterPlanilhaColada(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_PASTED_SHEET_KEY);
  } catch (e) {
    return null;
  }
}

// Retorna todas as máquinas com os modelos rigorosamente lidos do intervalo configurado
export function obterModelosComIntervalos(): ProximoSetupItem[] {
  const customizados = obterIntervalosSalvos();
  const maquinasBase = obterMaquinasBase();

  return maquinasBase.map((item) => {
    const customIntervalo = customizados[item.maquina];
    const intervaloFinal = customIntervalo !== undefined ? customIntervalo : item.intervaloPlanilha;

    // SEMPRE extrai diretamente do intervalo final respeitando a regra da planilha
    const { modelos: modelosDoIntervalo, descartados } = extrairModelosPorIntervaloComRegra(intervaloFinal);

    return {
      ...item,
      intervaloPlanilha: intervaloFinal,
      modelos: modelosDoIntervalo,
      descartados: descartados.length > 0 ? descartados : item.descartados,
    };
  });
}

// Normaliza nome de máquina para corresponder às máquinas cadastradas
export function normalizarNomeMaquina(raw: string, maquinasValidas: string[]): string | null {
  const clean = raw.trim().toUpperCase();
  if (!clean) return null;

  const exato = maquinasValidas.find((m) => m.toUpperCase() === clean);
  if (exato) return exato;

  const matchNum = clean.match(/\b(?:N|TORNO\s*|TC\s*0*|TC-?)(\d+)\b/i);
  if (matchNum) {
    const num = parseInt(matchNum[1], 10);
    if (num === 15) return null;
    const porNum = maquinasValidas.find((m) => {
      const mNum = m.match(/^N(\d+)\s*-/i);
      return mNum && parseInt(mNum[1], 10) === num;
    });
    if (porNum) return porNum;
  }

  if (clean.includes('C100') || clean.includes('C-100')) {
    return maquinasValidas.find((m) => m.includes('C100')) || 'N21 - INDEX C100';
  }
  if (clean.includes('32JIII') || clean.includes('32J')) {
    return maquinasValidas.find((m) => m.includes('32JIII')) || 'N17 - STAR 32JIII';
  }
  if (clean.includes('CITIZEN')) {
    return maquinasValidas.find((m) => m.includes('CITIZEN')) || 'N20 - CITIZEN';
  }
  if (clean.includes('TND') || clean.includes('180')) {
    return maquinasValidas.find((m) => m.includes('TND180')) || 'N4 - TND180';
  }
  if (clean.includes('TNG') || clean.includes('42')) {
    return maquinasValidas.find((m) => m.includes('TNG42')) || 'N12 - TNG42';
  }
  if (clean.includes('TBSY')) {
    return maquinasValidas.find((m) => m.includes('TBSY')) || 'N9 - TBSY';
  }
  if (clean.includes('SR38') || clean.includes('STAR 38') || clean.includes('STAR38')) {
    return maquinasValidas.find((m) => m.includes('STAR 38')) || 'N14 - STAR 38';
  }
  if (clean.includes('SR20J') || clean.includes('STAR20J')) {
    return maquinasValidas.find((m) => m.includes('STAR20J')) || 'N8 - STAR20J';
  }
  if (clean.includes('STAR16') || clean.includes('SB16')) {
    return maquinasValidas.find((m) => m.includes('STAR16')) || 'N6 - STAR16';
  }
  if (clean.includes('32R')) {
    return maquinasValidas.find((m) => m.includes('STAR 32R')) || 'N10 - STAR 32R';
  }

  return null;
}

// Parser completo que aplica cirurgicamente a regra descrita pelo usuário:
// 1) Olha o intervalo configurado de cada máquina (ex: Linhas 73 a 76, 45 a 50, etc.)
// 2) Traz TODOS os modelos válidos presentes no intervalo (não apenas 1)
// 3) Descarta os modelos onde a Coluna G tem quantidade produzida > 0
export function parseSpreadsheetDataComRegra(
  rawText: string,
  maquinasBase: ProximoSetupItem[]
): { itens: ProximoSetupItem[]; totalDescartados: number } {
  const lines = rawText.split(/\r?\n/).map((line) => {
    let cells: string[];
    if (line.includes('\t')) {
      cells = line.split('\t');
    } else if (line.includes(';') && !line.includes(',')) {
      cells = line.split(';');
    } else {
      const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
      const matches: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(line)) !== null) {
        if (m.index === regex.lastIndex) regex.lastIndex++;
        matches.push(m[1] ? m[1].replace(/^"|"$/g, '').trim() : '');
      }
      cells = matches.length > 0 ? matches : line.split(',');
    }
    return cells.map((c) => c.replace(/^"|"$/g, '').trim());
  });

  const customizados = obterIntervalosSalvos();
  let totalDescartados = 0;

  const resultado: ProximoSetupItem[] = maquinasBase.map((item) => {
    const intervaloConfigurado = customizados[item.maquina] || item.intervaloPlanilha;
    const range = extrairIntervaloNumeros(intervaloConfigurado);

    if (!range) {
      return {
        ...item,
        intervaloPlanilha: intervaloConfigurado,
      };
    }

    const modelosEncontrados: string[] = [];
    const descartados: ModeloDescartado[] = [];

    // Linha na planilha é 1-indexada (range.inicio a range.fim)
    for (let linhaNum = range.inicio; linhaNum <= range.fim; linhaNum++) {
      const idx = linhaNum - 1; // 0-based
      if (idx < 0 || idx >= lines.length) continue;

      const row = lines[idx];
      let modeloRaw = (row[2] || '').trim().toUpperCase();
      if (!modeloRaw && row[1]) {
        const b = row[1].trim().toUpperCase();
        if (!b.startsWith('TC') && !b.startsWith('TORNO') && !b.startsWith('CITIZEN') && !b.startsWith('INDEX')) {
          modeloRaw = b;
        }
      }

      const colG = row[6] || row[7] || '';

      if (!modeloRaw || modeloRaw === 'EM_EXECUCAO' || modeloRaw.includes('MODELO') || modeloRaw.includes('PEÇA')) {
        continue;
      }

      const numProduzida = parseFloat(colG.replace(/\./g, '').replace(',', '.'));
      const jaTemProducao = !isNaN(numProduzida) && numProduzida > 0;

      if (jaTemProducao) {
        totalDescartados++;
        descartados.push({
          modelo: modeloRaw,
          linha: linhaNum,
          qtdeProduzida: numProduzida,
          motivo: `Coluna G possui ${numProduzida} já produzidas (> 0)`,
        });
        continue; // DESCARTA!
      }

      // Se não tem produção > 0, mantém o modelo
      const parts = modeloRaw.split(/[,;/]+/).map((s) => s.trim().toUpperCase());
      for (const mod of parts) {
        if (mod && mod.length >= 2 && !modelosEncontrados.includes(mod)) {
          modelosEncontrados.push(mod);
        }
      }
    }

    return {
      maquina: item.maquina,
      intervaloPlanilha: intervaloConfigurado,
      modelos: modelosEncontrados,
      descartados,
    };
  });

  return { itens: resultado, totalDescartados };
}

export interface ChecarPlanilhaResult {
  todosEncontrados: ProximoSetupItem[];
  modelosAdicionados: string[];
  modelosJaExistentes: string[];
  origem: 'live' | 'mapeamento' | 'colada';
  mensagemRegra?: string;
}

// Função principal de checagem da planilha
export async function checarPlanilhaEAtualizarModelos(
  catalogoExistente: CatalogoItem[]
): Promise<ChecarPlanilhaResult> {
  let mappedData = obterModelosComIntervalos();
  let origem: 'live' | 'mapeamento' | 'colada' = 'mapeamento';

  // 1. Tenta buscar ao vivo via Google Sheets CSV / Export
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const urls = [SHEET_CSV_URL, SHEET_EXPORT_CSV_URL];
    let liveCsvText: string | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'text/csv, text/plain' },
        });
        if (res.ok) {
          const txt = await res.text();
          if (!txt.includes('Sign in to your Google Account') && !txt.includes('google-site-verification') && txt.length > 50) {
            liveCsvText = txt;
            break;
          }
        }
      } catch (e) {
        // tenta proxima
      }
    }
    clearTimeout(timeoutId);

    if (liveCsvText) {
      const parsed = parseSpreadsheetDataComRegra(liveCsvText, mappedData);
      if (parsed.itens.length > 0) {
        mappedData = parsed.itens;
        origem = 'live';
      }
    }
  } catch (err) {
    // Falha silenciosa se exigir login Google corporativo
  }

  // 2. Se houver dados de planilha colados manualmente pelo usuário
  if (origem === 'mapeamento') {
    const colada = obterPlanilhaColada();
    if (colada && colada.length > 30) {
      const parsedColada = parseSpreadsheetDataComRegra(colada, mappedData);
      if (parsedColada.itens.length > 0) {
        mappedData = parsedColada.itens;
        origem = 'colada';
      }
    }
  }

  // 3. Extrair todos os modelos únicos dos próximos setups
  const todosModelosSet = new Set<string>();
  mappedData.forEach((item) => {
    item.modelos.forEach((m) => {
      const trimmed = m.trim().toUpperCase();
      if (trimmed && trimmed.length >= 2) {
        todosModelosSet.add(trimmed);
      }
    });
  });

  const modelosCadastradosSet = new Set(
    catalogoExistente
      .filter((c) => c.categoria === 'modelos')
      .map((c) => c.valor.toUpperCase())
  );

  const modelosAdicionados: string[] = [];
  const modelosJaExistentes: string[] = [];

  for (const mod of todosModelosSet) {
    if (modelosCadastradosSet.has(mod)) {
      modelosJaExistentes.push(mod);
    } else {
      await salvarItemCatalogo({
        valor: mod,
        categoria: 'modelos',
        ativo: true,
      });
      modelosAdicionados.push(mod);
    }
  }

  return {
    todosEncontrados: mappedData,
    modelosAdicionados,
    modelosJaExistentes,
    origem,
    mensagemRegra: 'Regra ativa: Lê os números da coluna de linhas do canto da planilha, traz todos os modelos da Coluna C no intervalo, descartando onde a Coluna G tem produção > 0.',
  };
}
