import React, { useState, useEffect } from 'react';
import { ActiveTab, SetupRecord, TarefaConfig, CatalogoItem } from './types';
import {
  subscribeToSetups,
  subscribeToTarefas,
  subscribeToCatalogo,
  verificarEPopularBancoSeVazio,
  finalizarSetup,
  excluirSetup
} from './services/setupService';
import {
  DEFAULT_TAREFAS,
  DEFAULT_MODELOS,
  DEFAULT_MAQUINAS,
  DEFAULT_COLABORADORES,
  DEFAULT_TIPOS_MAQUINA
} from './data/defaultData';
import { Header } from './components/Header';
import { NovoSetupPanel } from './components/NovoSetupPanel';
import { PainelAtivoPanel } from './components/PainelAtivoPanel';
import { HistoricoPanel } from './components/HistoricoPanel';
import { GestorPanel } from './components/GestorPanel';

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('painel');

  // Gestor unlock state (password 8619)
  const [isGestorUnlocked, setIsGestorUnlocked] = useState(false);

  // Setup being edited / resumed
  const [editSetup, setEditSetup] = useState<SetupRecord | null>(null);

  // Setup being inspected in details modal in Historico
  const [activeDetailSetupId, setActiveDetailSetupId] = useState<string | null>(null);

  // Real-time Firestore records
  const [setups, setSetups] = useState<SetupRecord[]>([]);
  const [tarefas, setTarefas] = useState<TarefaConfig[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);

  // Initialize and listen to Firestore in real-time
  useEffect(() => {
    // Ensure initial spreadsheet seed data is ready in Firebase Firestore if empty
    verificarEPopularBancoSeVazio();

    // Listen to live setups
    const unsubSetups = subscribeToSetups((records) => {
      setSetups(records);
    });

    // Listen to live tasks
    const unsubTarefas = subscribeToTarefas((items) => {
      setTarefas(items);
    });

    // Listen to live catalog items
    const unsubCatalogo = subscribeToCatalogo((items) => {
      setCatalogo(items);
    });

    return () => {
      unsubSetups();
      unsubTarefas();
      unsubCatalogo();
    };
  }, []);

  // Merge with initial defaults if Firestore is still propagating
  const activeTarefas: TarefaConfig[] = tarefas.length > 0 ? tarefas : DEFAULT_TAREFAS;

  const activeCatalogo: CatalogoItem[] =
    catalogo.length > 0
      ? catalogo
      : [
          ...DEFAULT_TIPOS_MAQUINA.map((v) => ({ valor: v, categoria: 'tiposMaquinas' as const, ativo: true })),
          ...DEFAULT_MODELOS.map((v) => ({ valor: v, categoria: 'modelos' as const, ativo: true })),
          ...DEFAULT_MAQUINAS.map((v) => ({ valor: v, categoria: 'maquinas' as const, ativo: true })),
          ...DEFAULT_COLABORADORES.map((v) => ({ valor: v, categoria: 'colaboradores' as const, ativo: true })),
        ];

  // Active models in floor panel
  const modelosAtivosNoPainel = setups
    .filter((s) => !s.isFinalizado)
    .map((s) => s.modelo);

  // Resume setup from Painel Ativo
  const handleRetomar = (setup: SetupRecord) => {
    setEditSetup(setup);
    setActiveTab('novo');
  };

  const handleClearEdit = () => {
    setEditSetup(null);
  };

  const handleSaved = () => {
    setEditSetup(null);
    setActiveTab('painel');
  };

  // Finalize setup: removes from active, adds to history and navigates immediately
  const handleFinalizar = async (setupId: string, acao: 'ok' | 'cancelar') => {
    const now = new Date().toISOString();
    const statusGeral = acao === 'ok' ? '✅ EXECUTADO' : '❌ CANCELADO';

    // 1. Instant optimistic update so it disappears from Painel Ativo immediately
    setSetups((prev) =>
      prev.map((s) =>
        s.id === setupId
          ? {
              ...s,
              isFinalizado: true,
              statusGeral,
              finalizadoAt: now,
              finalizadoPor: 'SISTEMA',
            }
          : s
      )
    );

    // 2. If finished successfully, go directly to Historico and open this setup
    if (acao === 'ok') {
      setActiveDetailSetupId(setupId);
      setActiveTab('hist');
    }

    // 3. Persist to Firebase Firestore
    try {
      await finalizarSetup(setupId, acao, 'SISTEMA');
    } catch (e) {
      console.error('Erro ao persistir finalização no Firebase:', e);
    }
  };

  // Delete setup permanently from Firestore with optimistic update
  const handleDeleteSetup = async (setupId: string) => {
    setSetups((prev) => prev.filter((s) => s.id !== setupId));
    try {
      await excluirSetup(setupId);
    } catch (e) {
      console.error('Erro ao excluir setup:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-slate-900 flex flex-col font-sans">
      {/* Navbar exactly like the video */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ativosCount={setups.filter((s) => !s.isFinalizado).length}
        isGestorUnlocked={isGestorUnlocked}
        onResetNovo={handleClearEdit}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'novo' && (
          <NovoSetupPanel
            editSetup={editSetup}
            onClearEdit={handleClearEdit}
            onSaved={handleSaved}
            tarefas={activeTarefas}
            catalogo={activeCatalogo}
            modelosAtivosNoPainel={modelosAtivosNoPainel}
          />
        )}

        {activeTab === 'painel' && (
          <PainelAtivoPanel
            setups={setups}
            onRetomar={handleRetomar}
            onFinalizar={handleFinalizar}
          />
        )}

        {activeTab === 'hist' && (
          <HistoricoPanel
            setups={setups}
            activeDetailSetupId={activeDetailSetupId}
            onClearActiveDetail={() => setActiveDetailSetupId(null)}
            onDeleteSetup={handleDeleteSetup}
          />
        )}

        {activeTab === 'gestor' && (
          <GestorPanel
            isUnlocked={isGestorUnlocked}
            onUnlock={() => setIsGestorUnlocked(true)}
            onLock={() => setIsGestorUnlocked(false)}
            tarefas={activeTarefas}
            catalogo={activeCatalogo}
          />
        )}
      </main>
    </div>
  );
}
