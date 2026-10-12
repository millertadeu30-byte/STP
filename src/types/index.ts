export interface ChecklistItemResponse {
  tarefa: string;
  status: 'OK' | 'FALTA';
  obs: string;
}

export interface SetupRecord {
  id: string;
  colaborador: string;
  modelo: string;
  maquina: string;
  tipoMaquina: string;
  statusGeral: '✅ LIBERADO' | '⚠️ PENDENTE' | '✅ EXECUTADO' | '❌ CANCELADO';
  respostas: ChecklistItemResponse[];
  pendencias: string[];
  createdAt: string;
  updatedAt: string;
  finalizadoAt?: string;
  finalizadoPor?: string;
  isFinalizado: boolean;
}

export interface TarefaConfig {
  id?: string;
  nome: string;
  tipo: string;
  ordem?: number;
}

export type CatalogoCategoria = 'modelos' | 'maquinas' | 'colaboradores' | 'tiposMaquinas';

export interface CatalogoItem {
  id?: string;
  valor: string;
  categoria: CatalogoCategoria;
  ativo: boolean;
}

export type ActiveTab = 'novo' | 'painel' | 'hist' | 'gestor';
