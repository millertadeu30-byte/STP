// Utilitário de validação estrita para modelos de peças da fábrica
export function esModeloValido(texto?: string | null): boolean {
  if (!texto) return false;
  const limpo = texto.trim().toUpperCase();
  if (limpo.length < 2 || limpo.length > 25) return false;

  const blacklistHeaders = [
    'QTDE',
    'PRODUZIDA',
    'SOLICITADA',
    'CICLO',
    'PADRAO',
    'PADRÃO',
    'PECA',
    'PEÇA',
    'DESCRICAO',
    'DESCRIÇÃO',
    'STATUS',
    'EXECUCAO',
    'EXECUÇÃO',
    'EM_EXECUCAO',
    'MODELO',
    'TURNO',
    'NOTURNO',
    'ATUALIZADO',
    'MATERIAL',
    'TIPO',
    'BITOLA',
    'PRÓXIMO',
    'PROXIMO',
    'PLANEJAMENTO',
    'DIVERGÊNCIA',
    'DIVERGENCIA',
    'FILEIRA',
    'TRYOUT',
    'AGORA',
    'SIM',
    'NAO',
    'NÃO',
  ];

  if (blacklistHeaders.some((h) => limpo.includes(h))) {
    return false;
  }

  // Qualquer número com separador de milhar ou decimal (ex: "2.861", "10.325", "3.148", "2.065", "3.729", "12.711", "1.091")
  if (/\d+[.,]\d+/.test(limpo)) {
    return false;
  }

  // Modelos puramente numéricos permitidos da fábrica
  const modelosNumericosPermitidos = ['41152', '41150', '41746', '9160', '13138', '2538', '32092'];
  if (/^\d+$/.test(limpo) && !modelosNumericosPermitidos.includes(limpo)) {
    return false;
  }

  return true;
}
