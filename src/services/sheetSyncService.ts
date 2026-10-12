import { CatalogoItem } from '../types';
import { salvarItemCatalogo } from './setupService';

export const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1p6Iz9bjF94Ji7aNNVXga8GWrGsIKti14RTt7r1fWhkc/edit?gid=355779717#gid=355779717';

export const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1p6Iz9bjF94Ji7aNNVXga8GWrGsIKti14RTt7r1fWhkc/gviz/tq?tqx=out:csv&gid=355779717';

// Mapeamento cirúrgico extraído por intervalos demarcados da aba "Produções" (gid=355779717)
// Cada máquina com seu intervalo exato na planilha (linhas da planilha),
// trazendo os 1 ou 2 modelos programados abaixo da primeira linha de cada máquina,
// ou vazio ([]) caso esteja em branco.
export interface ProximoSetupItem {
  maquina: string;
  intervaloPlanilha?: string;
  modelos: string[];
}

const LOCAL_STORAGE_INTERVALS_KEY = 'usinagem_maquinas_intervalos_v1';
const LOCAL_STORAGE_CUSTOM_MODELOS_KEY = 'usinagem_maquinas_custom_modelos_v1';

// Tabela detalhada linha a linha da aba "Produções" (linhas 1 a 120 da planilha original)
// Permite extrair cirurgicamente o que existe em qualquer intervalo demarcado
export const LINHAS_PLANILHA_PRODUCOES: Record<number, { modelo?: string; maquina?: string; status?: string }> = {
  3: { maquina: 'N4 - TND180', status: 'HEADER' },
  4: { modelo: 'E119033', status: 'EM_EXECUCAO' }, // 1ª linha em execução
  5: {},
  6: {},
  7: {},
  8: {},

  9: { maquina: 'N6 - STAR16', status: 'HEADER' },
  10: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  11: { modelo: 'BR1404' },
  12: { modelo: '41152' },
  13: {},
  14: {},

  15: { maquina: 'N8 - STAR20J', status: 'HEADER' },
  16: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  17: { modelo: 'PC11279' },
  18: { modelo: 'PL1106' },
  19: {},
  20: {},

  21: { maquina: 'N9 - TBSY', status: 'HEADER' },
  22: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  23: { modelo: 'AL32003' },
  24: { modelo: 'AL104000' },
  25: {},
  26: {},

  27: { maquina: 'N10 - STAR 32R', status: 'HEADER' },
  28: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  29: { modelo: 'PL1151' },
  30: {},
  31: {},
  32: {},

  33: { maquina: 'N11 - STAR 20R', status: 'HEADER' },
  34: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  35: { modelo: 'AL132503' },
  36: {},
  37: {},
  38: {},

  39: { maquina: 'N12 - TNG42', status: 'HEADER' },
  40: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  41: { modelo: '41150' },
  42: {},
  43: {},
  44: {},

  45: { maquina: 'N13 - STAR 20R', status: 'HEADER' },
  46: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  47: { modelo: 'PC11103' },
  48: {},
  49: {},
  50: {},

  51: { maquina: 'N14 - STAR 38', status: 'HEADER' },
  52: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  53: { modelo: 'AL132008' }, // Apenas 1 modelo abaixo da 1ª linha
  54: {},
  55: {},
  56: {},

  57: { maquina: 'N16 - INDEX ABC', status: 'HEADER' },
  58: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  59: { modelo: '9160' },
  60: {},
  61: {},
  62: {},

  63: { maquina: 'N17 - STAR 32JIII', status: 'HEADER' },
  64: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  65: { modelo: 'AL32016' },
  66: {},
  67: {},
  68: {},

  69: { maquina: 'N18 - INDEX ABC', status: 'HEADER' },
  70: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  71: { modelo: 'BR102001' }, // Torno 18 / TC 18: exatamente 1 peça abaixo da 1ª linha
  72: {},

  // Linhas 73 a 76: N21 - INDEX C100 (conforme planilha do usuário / Foto 3)
  73: { maquina: 'N21 - INDEX C100', status: 'HEADER', modelo: 'CU2537' },
  74: { modelo: 'CU2538' },
  75: { modelo: 'CU2537' },
  76: { modelo: 'CU2538' },

  77: { maquina: 'N19 - STAR 20R', status: 'HEADER' },
  78: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  79: { modelo: '41746' },
  80: { modelo: 'CU25' },

  81: { maquina: 'N20 - CITIZEN', status: 'HEADER' },
  82: { modelo: 'EM_EXECUCAO', status: 'EM_EXECUCAO' },
  83: { modelo: 'PC1152' },
  84: {},
  85: {},
  86: {},

  87: {},
  88: {},
  89: {},
  90: {},
  91: {},
  92: {},

  93: {},
  94: {},
  95: { maquina: 'N18 - INDEX ABC', status: 'HEADER' },
  96: { modelo: 'BR102001' }, // TC 18 / Torno 18: 1 modelo (NUNCA CU2538 aqui!)
  97: {},
  98: {},
  99: {},
  100: {},

  101: { maquina: 'TA-01', status: 'HEADER' },
  102: {},
  103: {},
  104: {},
  105: {},
  106: {},
};

// Extrai os números de início e fim a partir de strings como "Linhas 73 a 76", "95 a 100", "73-76", "Linha 73 até 76"
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

// Extrai os modelos presentes exatamente no intervalo configurado
// Conforme solicitado pelo usuário:
// Varre exatamente o intervalo configurado (de range.inicio até range.fim)
// e traz somente a máquina e os modelos que estão nos intervalos configurados.
export function extrairModelosPorIntervalo(intervaloStr?: string): string[] {
  const range = extrairIntervaloNumeros(intervaloStr);
  if (!range) return [];

  const modelosEncontrados: string[] = [];

  for (let linha = range.inicio; linha <= range.fim; linha++) {
    const dadosLinha = LINHAS_PLANILHA_PRODUCOES[linha];
    if (dadosLinha && dadosLinha.modelo && dadosLinha.modelo !== 'EM_EXECUCAO') {
      const parts = dadosLinha.modelo.split(/[,;/]+/).map((s) => s.trim().toUpperCase());
      for (const mod of parts) {
        if (mod && mod !== 'EM_EXECUCAO' && !modelosEncontrados.includes(mod)) {
          modelosEncontrados.push(mod);
        }
      }
    }
  }

  return modelosEncontrados;
}

export const MODELOS_PRODUCOES_MAP: ProximoSetupItem[] = [
  {
    maquina: 'N4 - TND180',
    intervaloPlanilha: 'Linhas 3 a 8',
    modelos: [],
  },
  {
    maquina: 'N6 - STAR16',
    intervaloPlanilha: 'Linhas 9 a 14',
    modelos: ['BR1404', '41152'],
  },
  {
    maquina: 'N8 - STAR20J',
    intervaloPlanilha: 'Linhas 15 a 20',
    modelos: ['PC11279', 'PL1106'],
  },
  {
    maquina: 'N9 - TBSY',
    intervaloPlanilha: 'Linhas 21 a 26',
    modelos: ['AL32003', 'AL104000'],
  },
  {
    maquina: 'N10 - STAR 32R',
    intervaloPlanilha: 'Linhas 27 a 32',
    modelos: ['PL1151'],
  },
  {
    maquina: 'N11 - STAR 20R',
    intervaloPlanilha: 'Linhas 33 a 38',
    modelos: ['AL132503'],
  },
  {
    maquina: 'N12 - TNG42',
    intervaloPlanilha: 'Linhas 39 a 44',
    modelos: ['41150'],
  },
  {
    maquina: 'N13 - STAR 20R',
    intervaloPlanilha: 'Linhas 45 a 50',
    modelos: ['PC11103'],
  },
  {
    maquina: 'N14 - STAR 38',
    intervaloPlanilha: 'Linhas 51 a 56',
    modelos: ['AL132008'],
  },
  {
    maquina: 'N16 - INDEX ABC',
    intervaloPlanilha: 'Linhas 57 a 62',
    modelos: ['9160'],
  },
  {
    maquina: 'N17 - STAR 32JIII',
    intervaloPlanilha: 'Linhas 63 a 68',
    modelos: ['AL32016'],
  },
  {
    maquina: 'N18 - INDEX ABC',
    intervaloPlanilha: 'Linhas 69 a 74',
    modelos: ['BR102001'],
  },
  {
    maquina: 'N19 - STAR 20R',
    intervaloPlanilha: 'Linhas 77 a 80',
    modelos: ['41746', 'CU25'],
  },
  {
    maquina: 'N20 - CITIZEN',
    intervaloPlanilha: 'Linhas 81 a 86',
    modelos: ['PC1152'],
  },
  {
    maquina: 'N21 - INDEX C100',
    intervaloPlanilha: 'Linhas 73 a 76',
    modelos: ['CU2537', 'CU2538'],
  },
  {
    maquina: 'TA-01',
    intervaloPlanilha: 'Linhas 101 a 106',
    modelos: [],
  },
];

// Obtém os intervalos customizados persistidos no navegador
export function obterIntervalosSalvos(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INTERVALS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler intervalos do localStorage:', e);
  }
  return {};
}

// Obtém modelos personalizados salvos manualmente para cada máquina
export function obterModelosCustomizadosSalvos(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao ler modelos customizados do localStorage:', e);
  }
  return {};
}

// Salva modelos personalizados diretamente para uma máquina
export function salvarModelosCustomizadosMaquina(maquina: string, modelos: string[]): void {
  try {
    const atuais = obterModelosCustomizadosSalvos();
    atuais[maquina] = modelos;
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_MODELOS_KEY, JSON.stringify(atuais));
  } catch (e) {
    console.error('Erro ao salvar modelos customizados no localStorage:', e);
  }
}

// Salva o intervalo de uma máquina e recalcula cirurgicamente os modelos a partir dele
export function salvarIntervaloMaquina(maquina: string, novoIntervalo: string): string[] {
  try {
    const atuais = obterIntervalosSalvos();
    const limpo = novoIntervalo.trim();
    if (!limpo) {
      delete atuais[maquina];
    } else {
      atuais[maquina] = limpo;
    }
    localStorage.setItem(LOCAL_STORAGE_INTERVALS_KEY, JSON.stringify(atuais));

    // Ao mudar o intervalo e fechar o cadeado, os modelos devem refletir EXATAMENTE
    // as linhas desse novo intervalo configurado!
    const modelosDoIntervalo = extrairModelosPorIntervalo(limpo);
    salvarModelosCustomizadosMaquina(maquina, modelosDoIntervalo);
    return modelosDoIntervalo;
  } catch (e) {
    console.error('Erro ao salvar intervalo no localStorage:', e);
  }
  return extrairModelosPorIntervalo(novoIntervalo);
}

// Retorna os dados de mapeamento combinando os padrões com os intervalos configurados nos cadeados
export function obterModelosComIntervalos(): ProximoSetupItem[] {
  const customizados = obterIntervalosSalvos();
  const modelosCustomizados = obterModelosCustomizadosSalvos();

  return MODELOS_PRODUCOES_MAP.map((item) => {
    const customIntervalo = customizados[item.maquina];
    const intervaloFinal = customIntervalo !== undefined ? customIntervalo : item.intervaloPlanilha;

    // Extrai cirurgicamente pelas linhas demarcadas no cadeado ou no padrão
    const modelosDoIntervalo = extrairModelosPorIntervalo(intervaloFinal);

    let modelosFinais: string[];
    // Se o usuário configurou o intervalo no cadeado: obedece 100% ao intervalo configurado!
    if (customIntervalo !== undefined) {
      modelosFinais = modelosDoIntervalo;
    } else if (modelosDoIntervalo.length > 0) {
      modelosFinais = modelosDoIntervalo;
    } else if (modelosCustomizados[item.maquina] && modelosCustomizados[item.maquina].length > 0) {
      modelosFinais = modelosCustomizados[item.maquina];
    } else {
      modelosFinais = item.modelos;
    }

    return {
      ...item,
      intervaloPlanilha: intervaloFinal,
      modelos: modelosFinais,
    };
  });
}

// Normaliza nome de máquina para corresponder exatamente às máquinas cadastradas
export function normalizarNomeMaquina(raw: string, maquinasValidas: string[]): string | null {
  const clean = raw.trim().toUpperCase();
  if (!clean) return null;

  // 1. Correspondência direta exata
  const exato = maquinasValidas.find((m) => m.toUpperCase() === clean);
  if (exato) return exato;

  // 2. Correspondência por número de máquina N / TORNO / TC (ex: N17, TC 18, TC14, TORNO 14, TC0018)
  const matchNum = clean.match(/\b(?:N|TORNO\s*|TC\s*0*|TC-?)(\d+)\b/i);
  if (matchNum) {
    const num = parseInt(matchNum[1], 10);
    // NÃO existe torno 15!
    if (num === 15) return null;
    const porNum = maquinasValidas.find((m) => {
      const mNum = m.match(/^N(\d+)\s*-/i);
      return mNum && parseInt(mNum[1], 10) === num;
    });
    if (porNum) return porNum;
  }

  // 3. Correspondência por modelo específico de máquina
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

// Parser de CSV caso a planilha seja exportada em formato de texto/CSV
export function parseCSVProducoes(csvText: string, maquinasValidas?: string[]): ProximoSetupItem[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));
  const resultados: ProximoSetupItem[] = [];
  const listaMaquinas = maquinasValidas && maquinasValidas.length > 0
    ? maquinasValidas
    : MODELOS_PRODUCOES_MAP.map((m) => m.maquina);

  let currentMachine = '';
  let machineRows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    // Procurar identificador de máquina (N4 a N21, TC, TORNO, TND, STAR, INDEX, CITIZEN, etc.)
    const rawCell = row.find((cell) =>
      /\b(?:N\d+|TC\s*0*\d+|TORNO\s*\d+)\b/i.test(cell) ||
      cell.includes('STAR') ||
      cell.includes('INDEX') ||
      cell.includes('TND') ||
      cell.includes('CITIZEN') ||
      cell.includes('TBSY') ||
      cell.includes('TNG')
    );

    const normalized = rawCell ? normalizarNomeMaquina(rawCell, listaMaquinas) : null;

    if (normalized && normalized !== currentMachine) {
      if (currentMachine && machineRows.length > 1) {
        // Pega os modelos das 2 linhas após a primeira linha
        const nextModels = machineRows
          .slice(1, 3)
          .map((r) => r[2] || r[1])
          .filter(Boolean);
        resultados.push({ maquina: currentMachine, modelos: nextModels });
      }
      currentMachine = normalized;
      machineRows = [row];
    } else if (currentMachine) {
      machineRows.push(row);
    }
  }

  if (currentMachine && machineRows.length > 1) {
    const nextModels = machineRows
      .slice(1, 3)
      .map((r) => r[2] || r[1])
      .filter(Boolean);
    resultados.push({ maquina: currentMachine, modelos: nextModels });
  }

  return resultados.length > 0 ? resultados : MODELOS_PRODUCOES_MAP;
}

export interface ChecarPlanilhaResult {
  todosEncontrados: ProximoSetupItem[];
  modelosAdicionados: string[];
  modelosJaExistentes: string[];
  origem: 'live' | 'mapeamento';
}

// Função principal de checagem da planilha
export async function checarPlanilhaEAtualizarModelos(
  catalogoExistente: CatalogoItem[]
): Promise<ChecarPlanilhaResult> {
  const maquinasCadastradas = catalogoExistente
    .filter((c) => c.categoria === 'maquinas' && c.ativo)
    .map((c) => c.valor);

  let mappedData = obterModelosComIntervalos();
  let origem: 'live' | 'mapeamento' = 'mapeamento';

  // Tenta fetch direto via Google Visualization API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(SHEET_CSV_URL, {
      signal: controller.signal,
      headers: { Accept: 'text/csv, text/plain' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (!text.includes('Sign in to your Google Account') && text.length > 100) {
        const parsed = parseCSVProducoes(text, maquinasCadastradas);
        if (parsed.length > 0) {
          // Merge custom intervals if any
          const customizados = obterIntervalosSalvos();
          mappedData = parsed.map((p) => ({
            ...p,
            intervaloPlanilha: customizados[p.maquina] || p.intervaloPlanilha,
          }));
          origem = 'live';
        }
      }
    }
  } catch (err) {
    // Se falhar (CORS ou autenticação Google Drive restrita), usa o mapeamento verificado da planilha
    origem = 'mapeamento';
  }

  // Extrair todos os modelos únicos dos próximos setups
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
      // Salva no banco Firebase Firestore
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
  };
}
