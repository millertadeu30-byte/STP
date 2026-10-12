import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/error';
import { SetupRecord, TarefaConfig, CatalogoItem, CatalogoCategoria } from '../types';
import {
  DEFAULT_TAREFAS,
  DEFAULT_MODELOS,
  DEFAULT_MAQUINAS,
  DEFAULT_COLABORADORES,
  DEFAULT_TIPOS_MAQUINA
} from '../data/defaultData';

const SETUPS_COLLECTION = 'setups';
const TAREFAS_COLLECTION = 'tarefas';
const CATALOGO_COLLECTION = 'catalogo';

// Listen to all setups in real-time
export function subscribeToSetups(callback: (setups: SetupRecord[]) => void): () => void {
  const colRef = collection(db, SETUPS_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SetupRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push({ id: docSnap.id, ...(docSnap.data() as Omit<SetupRecord, 'id'>) });
      });
      callback(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, SETUPS_COLLECTION);
    }
  );
}

// Save or Update a Setup
export async function salvarSetup(data: {
  id?: string;
  colaborador: string;
  modelo: string;
  maquina: string;
  tipoMaquina: string;
  respostas: { tarefa: string; status: 'OK' | 'FALTA'; obs: string }[];
}): Promise<SetupRecord> {
  const setupId = data.id || `STP-${Date.now()}`;
  const now = new Date().toISOString();

  const pendencias = data.respostas
    .filter((r) => r.status === 'FALTA')
    .map((r) => `${r.tarefa}${r.obs ? ` (${r.obs})` : ''}`);

  const statusGeral: SetupRecord['statusGeral'] = pendencias.length > 0 ? '⚠️ PENDENTE' : '✅ LIBERADO';

  const docRef = doc(db, SETUPS_COLLECTION, setupId);

  const payload: SetupRecord = {
    id: setupId,
    colaborador: data.colaborador,
    modelo: data.modelo,
    maquina: data.maquina,
    tipoMaquina: data.tipoMaquina,
    statusGeral,
    respostas: data.respostas,
    pendencias,
    createdAt: data.id ? now : now, // will be preserved if updated
    updatedAt: now,
    isFinalizado: false
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETUPS_COLLECTION}/${setupId}`);
  }
}

// Finalize setup (Execute or Cancel)
export async function finalizarSetup(
  id: string,
  acao: 'ok' | 'cancelar',
  usuario?: string
): Promise<void> {
  const docRef = doc(db, SETUPS_COLLECTION, id);
  const statusGeral: SetupRecord['statusGeral'] = acao === 'ok' ? '✅ EXECUTADO' : '❌ CANCELADO';

  try {
    await setDoc(
      docRef,
      {
        statusGeral,
        isFinalizado: true,
        finalizadoAt: new Date().toISOString(),
        finalizadoPor: usuario || auth.currentUser?.email || 'SISTEMA'
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${SETUPS_COLLECTION}/${id}`);
  }
}

// Delete setup permanently (manager action)
export async function excluirSetup(id: string): Promise<void> {
  const docRef = doc(db, SETUPS_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${SETUPS_COLLECTION}/${id}`);
  }
}

// Real-time subscription to Checklist Tasks
export function subscribeToTarefas(callback: (tarefas: TarefaConfig[]) => void): () => void {
  const colRef = collection(db, TAREFAS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const tarefas: TarefaConfig[] = [];
      snapshot.forEach((docSnap) => {
        tarefas.push({ id: docSnap.id, ...(docSnap.data() as Omit<TarefaConfig, 'id'>) });
      });
      // Sort by ordem or nome
      tarefas.sort((a, b) => (a.ordem || 999) - (b.ordem || 999));
      callback(tarefas);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, TAREFAS_COLLECTION);
    }
  );
}

// Add or update a TarefaConfig
export async function salvarTarefa(tarefa: TarefaConfig): Promise<void> {
  const id = tarefa.id || `tar-${Date.now()}`;
  const docRef = doc(db, TAREFAS_COLLECTION, id);
  try {
    await setDoc(docRef, { ...tarefa, id }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${TAREFAS_COLLECTION}/${id}`);
  }
}

// Delete a TarefaConfig
export async function excluirTarefa(id: string): Promise<void> {
  const docRef = doc(db, TAREFAS_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${TAREFAS_COLLECTION}/${id}`);
  }
}

// Real-time subscription to Catalog items
export function subscribeToCatalogo(callback: (itens: CatalogoItem[]) => void): () => void {
  const colRef = collection(db, CATALOGO_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const itens: CatalogoItem[] = [];
      snapshot.forEach((docSnap) => {
        itens.push({ id: docSnap.id, ...(docSnap.data() as Omit<CatalogoItem, 'id'>) });
      });
      callback(itens);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CATALOGO_COLLECTION);
    }
  );
}

// Add or update Catalog Item
export async function salvarItemCatalogo(item: CatalogoItem): Promise<void> {
  const id = item.id || `cat-${item.categoria}-${Date.now()}`;
  const docRef = doc(db, CATALOGO_COLLECTION, id);
  try {
    await setDoc(docRef, { ...item, id }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CATALOGO_COLLECTION}/${id}`);
  }
}

// Delete Catalog Item
export async function excluirItemCatalogo(id: string): Promise<void> {
  const docRef = doc(db, CATALOGO_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CATALOGO_COLLECTION}/${id}`);
  }
}

// Check and seed default data if empty (Planilhas 1, 2, 3, 4)
export async function verificarEPopularBancoSeVazio(forceSeed = false): Promise<boolean> {
  try {
    const tarefasSnapshot = await getDocs(collection(db, TAREFAS_COLLECTION));
    const catalogoSnapshot = await getDocs(collection(db, CATALOGO_COLLECTION));

    if (!forceSeed && tarefasSnapshot.size > 0 && catalogoSnapshot.size > 0) {
      return false; // already populated
    }

    const batch = writeBatch(db);

    // Seed Tarefas
    DEFAULT_TAREFAS.forEach((tar, index) => {
      const docRef = doc(db, TAREFAS_COLLECTION, `tar-${tar.tipo.replace(/\s+/g, '_')}-${index + 1}`);
      batch.set(docRef, { ...tar, id: docRef.id });
    });

    // Seed Tipos de Máquina
    DEFAULT_TIPOS_MAQUINA.forEach((tipo, index) => {
      const docRef = doc(db, CATALOGO_COLLECTION, `cat-tiposMaquinas-${index + 1}`);
      batch.set(docRef, { id: docRef.id, valor: tipo, categoria: 'tiposMaquinas', ativo: true });
    });

    // Seed Modelos
    DEFAULT_MODELOS.forEach((mod, index) => {
      const docRef = doc(db, CATALOGO_COLLECTION, `cat-modelos-${index + 1}`);
      batch.set(docRef, { id: docRef.id, valor: mod, categoria: 'modelos', ativo: true });
    });

    // Seed Máquinas
    DEFAULT_MAQUINAS.forEach((maq, index) => {
      const docRef = doc(db, CATALOGO_COLLECTION, `cat-maquinas-${index + 1}`);
      batch.set(docRef, { id: docRef.id, valor: maq, categoria: 'maquinas', ativo: true });
    });

    // Seed Colaboradores
    DEFAULT_COLABORADORES.forEach((col, index) => {
      const docRef = doc(db, CATALOGO_COLLECTION, `cat-colaboradores-${index + 1}`);
      batch.set(docRef, { id: docRef.id, valor: col, categoria: 'colaboradores', ativo: true });
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Erro ao popular banco:', error);
    return false;
  }
}
