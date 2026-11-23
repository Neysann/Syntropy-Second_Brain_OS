'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Bell,
  ShieldAlert,
  CheckSquare,
  FileText,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Zap,
  Cpu,
  HardDrive,
  SlidersHorizontal,
  X,
  RotateCcw,
  Layers,
  Terminal,
  Brain,
  Activity,
  Wifi,
  WifiOff,
  Sparkles,
  Sun,
  Power,
  Download,
  Laptop,
} from 'lucide-react';
import { APP_VERSION } from '@/lib/core/version';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useData } from '@/context/DataContext';
import { useDailyLife } from '@/context/DailyLifeContext';
import {
  EvrisApprovalRequest,
  EvrisDomain,
  EvrisExecutedTool,
  EvrisLogEntry,
  EvrisMemory,
  EvrisMessage,
  EvrisModelsStatus,
  EvrisRoutingMode,
  EvrisSyntropyContext,
  EvrisTelemetry,
  EvrisTier,
} from '@/types/evris';
import {
  createEvrisMemory,
  DEFAULT_OFFLINE_STATUS,
  deleteEvrisMemory,
  EVRIS_MEMORIES_STORAGE_KEY,
  EVRIS_MESSAGES_STORAGE_KEY,
  EVRIS_SETTINGS_STORAGE_KEY,
  EVRIS_TOOL_CATALOG,
  fetchEvrisBackendStatus,
  fetchEvrisLogs,
  fetchEvrisMemories,
  getSavedEvrisUrl,
  patchEvrisSettings,
  resolveEvrisApproval,
  saveEvrisUrl,
  sendEvrisBackendMessage,
} from '@/lib/integrations/evrisClient';
import { EvrisArcCore, EvrisCoreState, EVRIS_CORE_STATES } from './EvrisArcCore';

type DrawerTab = 'core' | 'memories' | 'system' | 'settings';

const MODE_OPTIONS: { id: EvrisRoutingMode; label: string; short: string; modelHint: string }[] = [
  { id: 'auto', label: 'AUTO', short: 'Auto', modelHint: 'qwen3.5:4b / 9b' },
  { id: 'fast', label: 'FAST • 4B', short: '4B', modelHint: 'qwen3.5:4b' },
  { id: 'pro', label: 'PRO • 9B', short: '9B', modelHint: 'qwen3.5:9b' },
  { id: 'limitless', label: 'LIMITLESS', short: '∞', modelHint: 'qwen3.5-abliterated:9b' },
];

const QUICK_PROMPTS: { label: string; prompt: string }[] = [
  { label: 'Mes tâches du jour', prompt: '/tasks' },
  { label: 'Mes notes récentes', prompt: '/notes' },
  { label: 'Rapport système PC', prompt: 'Donne-moi un rapport système complet du PC.' },
  { label: 'Nouvelle tâche rapide', prompt: '/task Préparer la démo E.V.R.I.S.' },
];

const CORE_STATE_LIST: EvrisCoreState[] = [
  'idle',
  'listening',
  'thinking',
  'speaking',
  'happy',
  'alert',
  'error',
  'sleep',
];

const BRIGHTNESS_STORAGE_KEY = 'syntropy_evris_arc_brightness_v1';

export const EvrisHub: React.FC = () => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { tasks, notes, projects, addTask, addNote } = useData();
  const { currentStreak } = useDailyLife();

  const isDark = theme === 'dark';
  const isNothing = settings.uiStyle === 'nothing';
  const isCyberpunk = settings.uiStyle === 'cyberpunk';

  const [isDesktopApp, setIsDesktopApp] = useState<boolean | null>(null);

  useEffect(() => {
    setIsDesktopApp(
      typeof window !== 'undefined' && Boolean((window as any).electronAPI?.isDesktop)
    );
  }, []);

  // Connexion & réglages
  const [apiUrl, setApiUrl] = useState<string>('http://127.0.0.1:8000');
  const [apiUrlDraft, setApiUrlDraft] = useState<string>('http://127.0.0.1:8000');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);

  const [modelsStatus, setModelsStatus] = useState<EvrisModelsStatus>(DEFAULT_OFFLINE_STATUS);
  const [telemetry, setTelemetry] = useState<EvrisTelemetry>({
    hostname: 'WORKSTATION',
    os: 'Windows 11',
    cpu_percent: 12,
    ram_used_gb: 15.6,
    ram_total_gb: 32.0,
    ram_free_gb: 16.4,
    ram_percent: 48.8,
    timestamp: '--:--:--',
  });

  const [routingMode, setRoutingMode] = useState<EvrisRoutingMode>('auto');
  const [proEnabled, setProEnabled] = useState<boolean>(true);
  const [confirmRisky, setConfirmRisky] = useState<boolean>(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(true);
  const [ramThresholdGb, setRamThresholdGb] = useState<number>(5.5);
  const [injectSyntropyContext, setInjectSyntropyContext] = useState<boolean>(true);

  // Conversation
  const [messages, setMessages] = useState<EvrisMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isStreamingTokens, setIsStreamingTokens] = useState<boolean>(false);
  const [liveStatusLine, setLiveStatusLine] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedMsgFeedback, setSavedMsgFeedback] = useState<string | null>(null);

  // Noyau ARC 25x25 — états dynamiques
  const [arcBrightness, setArcBrightness] = useState<number>(88);
  const [manualPreviewState, setManualPreviewState] = useState<EvrisCoreState | null>(null);
  const [transientState, setTransientState] = useState<EvrisCoreState | null>(null);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);

  // Tiroir latéral Système
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('core');

  // Mémoires, Logs, Outils, Approvals
  const [memories, setMemories] = useState<EvrisMemory[]>([]);
  const [newMemCategory, setNewMemCategory] = useState<string>('preference');
  const [newMemContent, setNewMemContent] = useState<string>('');
  const [logs, setLogs] = useState<EvrisLogEntry[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [approvals, setApprovals] = useState<EvrisApprovalRequest[]>([]);
  const [activeApproval, setActiveApproval] = useState<EvrisApprovalRequest | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseTransientState = useCallback((st: EvrisCoreState, durationMs = 2600) => {
    if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
    setTransientState(st);
    setIsSleeping(false);
    transientTimerRef.current = setTimeout(() => {
      setTransientState(null);
    }, durationMs);
  }, []);

  const resetSleepTimer = useCallback(() => {
    setIsSleeping(false);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      setIsSleeping(true);
    }, 65000);
  }, []);

  useEffect(() => {
    resetSleepTimer();
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (transientTimerRef.current) clearTimeout(transientTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [resetSleepTimer]);

  // État calculé en temps réel du noyau ARC 25x25
  const effectiveCoreState: EvrisCoreState = useMemo(() => {
    if (manualPreviewState) return manualPreviewState;
    if (approvals.length > 0 || activeApproval) return 'alert';
    if (transientState === 'error') return 'error';
    if (isStreamingTokens) return 'speaking';
    if (isSending || isCheckingBackend) return 'thinking';
    if (transientState) return transientState;
    if (isTyping) return 'listening';
    if (isSleeping) return 'sleep';
    return 'idle';
  }, [
    manualPreviewState,
    approvals.length,
    activeApproval,
    transientState,
    isStreamingTokens,
    isSending,
    isCheckingBackend,
    isTyping,
    isSleeping,
  ]);

  const coreMeta = EVRIS_CORE_STATES[effectiveCoreState];

  const appendLocalLog = useCallback(
    (level: 'INFO' | 'WARN' | 'ERROR', source: string, message: string) => {
      const now = new Date().toLocaleTimeString('fr-FR');
      setLogs((prev) => [
        ...prev.slice(-149),
        {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          level,
          source,
          message,
        },
      ]);
    },
    []
  );

  // Contexte temps réel Syntropy OS
  const syntropyContext = useMemo<EvrisSyntropyContext>(() => {
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    return {
      pendingTasksCount: pendingTasks.length,
      topTasks: pendingTasks.slice(0, 8).map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
      })),
      notesCount: notes.length,
      recentNotes: notes.slice(0, 6).map((n) => ({
        id: n.id,
        title: n.title,
        category: n.category,
        tags: n.tags || [],
      })),
      projectsCount: projects.length,
      activeProjects: projects.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.title,
        status: p.status,
      })),
      currentStreak,
    };
  }, [tasks, notes, projects, currentStreak]);

  // Chargement initial localStorage
  useEffect(() => {
    const savedUrl = getSavedEvrisUrl();
    setApiUrl(savedUrl);
    setApiUrlDraft(savedUrl);

    try {
      const savedBright = localStorage.getItem(BRIGHTNESS_STORAGE_KEY);
      if (savedBright) {
        const n = Number(savedBright);
        if (!Number.isNaN(n) && n >= 20 && n <= 100) setArcBrightness(n);
      }
    } catch {}

    try {
      const rawCfg = localStorage.getItem(EVRIS_SETTINGS_STORAGE_KEY);
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        if (parsed.routingMode) setRoutingMode(parsed.routingMode);
        if (typeof parsed.proEnabled === 'boolean') setProEnabled(parsed.proEnabled);
        if (typeof parsed.confirmRisky === 'boolean') setConfirmRisky(parsed.confirmRisky);
        if (typeof parsed.webSearchEnabled === 'boolean') setWebSearchEnabled(parsed.webSearchEnabled);
        if (typeof parsed.ramThresholdGb === 'number') setRamThresholdGb(parsed.ramThresholdGb);
        if (typeof parsed.injectSyntropyContext === 'boolean') {
          setInjectSyntropyContext(parsed.injectSyntropyContext);
        }
      }
    } catch {}

    try {
      const rawMsgs = localStorage.getItem(EVRIS_MESSAGES_STORAGE_KEY);
      if (rawMsgs) {
        const parsed = JSON.parse(rawMsgs);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}

    try {
      const rawMems = localStorage.getItem(EVRIS_MEMORIES_STORAGE_KEY);
      if (rawMems) {
        const parsed = JSON.parse(rawMems);
        if (Array.isArray(parsed)) setMemories(parsed);
      } else {
        setMemories([
          {
            id: 1,
            category: 'hardware',
            content: 'Workstation Windows : 32 Go RAM, NVIDIA RTX 5060 8 Go VRAM',
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
          {
            id: 2,
            category: 'system',
            content: 'Connecté à l’espace Syntropy OS (Tâches, Notes, Projets, Habitudes)',
            created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
          },
        ]);
      }
    } catch {}

    appendLocalLog('INFO', 'ui', 'Noyau ARC 25×25 & interface E.V.R.I.S. initialisés.');
  }, [appendLocalLog]);

  useEffect(() => {
    try {
      localStorage.setItem(EVRIS_MESSAGES_STORAGE_KEY, JSON.stringify(messages.slice(-60)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(EVRIS_MEMORIES_STORAGE_KEY, JSON.stringify(memories));
    } catch {}
  }, [memories]);

  useEffect(() => {
    try {
      localStorage.setItem(
        EVRIS_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          routingMode,
          proEnabled,
          confirmRisky,
          webSearchEnabled,
          ramThresholdGb,
          injectSyntropyContext,
        })
      );
    } catch {}
  }, [routingMode, proEnabled, confirmRisky, webSearchEnabled, ramThresholdGb, injectSyntropyContext]);

  useEffect(() => {
    try {
      localStorage.setItem(BRIGHTNESS_STORAGE_KEY, String(arcBrightness));
    } catch {}
  }, [arcBrightness]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveStatusLine]);

  // Synchronisation backend FastAPI local
  const syncBackend = useCallback(
    async (targetUrl: string, silent = false) => {
      if (!silent) setIsCheckingBackend(true);
      const res = await fetchEvrisBackendStatus(targetUrl);
      if (res.connected) {
        setBackendConnected(true);
        if (res.status) {
          setModelsStatus(res.status);
          if (res.status.routing_mode) setRoutingMode(res.status.routing_mode);
          if (typeof res.status.pro_enabled === 'boolean') setProEnabled(res.status.pro_enabled);
          if (typeof res.status.confirm_risky_actions === 'boolean') {
            setConfirmRisky(res.status.confirm_risky_actions);
          }
          if (typeof res.status.web_search_enabled === 'boolean') {
            setWebSearchEnabled(res.status.web_search_enabled);
          }
          if (typeof res.status.pro_min_free_ram_gb === 'number') {
            setRamThresholdGb(res.status.pro_min_free_ram_gb);
          }
        }
        if (res.telemetry) setTelemetry(res.telemetry);
        if (res.pendingApprovals) setApprovals(res.pendingApprovals);

        const remoteMems = await fetchEvrisMemories(targetUrl);
        if (remoteMems) setMemories(remoteMems);

        const remoteLogs = await fetchEvrisLogs(targetUrl, 80);
        if (remoteLogs) setLogs(remoteLogs);

        if (!silent) {
          appendLocalLog('INFO', 'bridge', `Connecté au serveur EVRIS local (${targetUrl}).`);
          pulseTransientState('happy', 1800);
        }
      } else {
        setBackendConnected(false);
        if (!silent) {
          appendLocalLog('WARN', 'bridge', `Backend hors ligne (${targetUrl}) — pont local actif.`);
          pulseTransientState('error', 2600);
        }
      }
      if (!silent) {
        setIsCheckingBackend(false);
        setLiveStatusLine('');
      }
      return res.connected;
    },
    [appendLocalLog, pulseTransientState]
  );

  // Maintien du polling uniquement une fois démarré manuellement
  useEffect(() => {
    if (!backendConnected) return;
    const interval = setInterval(() => syncBackend(apiUrl, true), 15000);
    return () => clearInterval(interval);
  }, [apiUrl, backendConnected, syncBackend]);

  const handleToggleEvrisConnection = async () => {
    resetSleepTimer();
    setManualPreviewState(null);
    if (backendConnected) {
      setBackendConnected(false);
      setModelsStatus(DEFAULT_OFFLINE_STATUS);
      appendLocalLog('INFO', 'bridge', 'Connexion E.V.R.I.S. arrêtée manuellement.');
      return;
    }
    setLiveStatusLine('Démarrage de la connexion E.V.R.I.S. & des modèles...');
    await syncBackend(apiUrl, false);
  };

  const applyMode = async (mode: EvrisRoutingMode) => {
    resetSleepTimer();
    setRoutingMode(mode);
    setModelsStatus((prev) => ({ ...prev, routing_mode: mode }));
    appendLocalLog('INFO', 'router', `Mode de routage : ${mode.toUpperCase()}.`);
    if (backendConnected) {
      await patchEvrisSettings(apiUrl, { routing_mode: mode });
    }
  };

  const applySettingToggle = async (
    key: 'pro_enabled' | 'confirm_risky_actions' | 'web_search_enabled' | 'pro_min_free_ram_gb',
    value: boolean | number
  ) => {
    if (key === 'pro_enabled') setProEnabled(Boolean(value));
    if (key === 'confirm_risky_actions') setConfirmRisky(Boolean(value));
    if (key === 'web_search_enabled') setWebSearchEnabled(Boolean(value));
    if (key === 'pro_min_free_ram_gb') setRamThresholdGb(Number(value));
    appendLocalLog('INFO', 'settings', `Paramètre ${key} = ${value}`);
    if (backendConnected) {
      await patchEvrisSettings(apiUrl, { [key]: value });
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    resetSleepTimer();
    setManualPreviewState(null);
    if (val.trim().length > 0) {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 2400);
    } else {
      setIsTyping(false);
    }
  };

  // Sauvegarde d'une réponse en Note / Tâche Syntropy OS
  const handleSaveReplyToNote = async (msg: EvrisMessage) => {
    const firstLine =
      msg.content
        .split('\n')
        .map((l) => l.replace(/^[#*\-\s]+/, '').trim())
        .find(Boolean)
        ?.slice(0, 64) || 'Note E.V.R.I.S.';
    await addNote({
      title: `EVRIS — ${firstLine}`,
      content: `# ${firstLine}\n\n${msg.content}\n`,
      category: 'resource',
      tags: ['evris', msg.tier || 'ia'],
      isPinned: false,
    });
    setSavedMsgFeedback(`note:${msg.id}`);
    pulseTransientState('happy', 2200);
    appendLocalLog('INFO', 'syntropy', `Réponse enregistrée en Note (« ${firstLine} »).`);
    setTimeout(() => setSavedMsgFeedback(null), 1600);
  };

  const handleSaveReplyToTask = async (msg: EvrisMessage) => {
    const firstLine =
      msg.content
        .split('\n')
        .map((l) => l.replace(/^[#*\-\s]+/, '').trim())
        .find(Boolean)
        ?.slice(0, 90) || 'Action E.V.R.I.S.';
    await addTask({
      title: firstLine,
      description: msg.content,
      status: 'todo',
      priority: 'high',
      category: 'project',
      tags: ['evris'],
    });
    setSavedMsgFeedback(`task:${msg.id}`);
    pulseTransientState('happy', 2200);
    appendLocalLog('INFO', 'syntropy', `Tâche créée (« ${firstLine} »).`);
    setTimeout(() => setSavedMsgFeedback(null), 1600);
  };

  const handleCopyMessage = (msg: EvrisMessage) => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  // Commandes locales & Pont Syntropy OS
  const tryHandleLocalCommand = async (rawText: string): Promise<EvrisMessage | null> => {
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();
    const nowIso = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (lower === '/clear') {
      setMessages([]);
      appendLocalLog('INFO', 'chat', 'Conversation réinitialisée.');
      return null;
    }

    if (lower === '/help' || lower === '/commands') {
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: [
          '### Commandes rapides E.V.R.I.S.',
          '- `/tasks` ou `/task <titre>` — Lire ou créer une tâche Syntropy OS',
          '- `/notes [mot-clé]` ou `/note <titre> :: <contenu>` — Lire ou créer une note',
          '- `/mode auto|fast|pro|limitless` — Changer de modèle',
          '- `/memories` • `/status` • `/clear`',
        ].join('\n'),
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 4,
        createdAt: nowIso,
      };
    }

    const modeMatch = trimmed.match(/^\/mode\s+(auto|fast|pro|limitless)$/i);
    if (modeMatch) {
      const nextMode = modeMatch[1].toLowerCase() as EvrisRoutingMode;
      await applyMode(nextMode);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Mode de routage défini sur **${nextMode.toUpperCase()}**.`,
        tier: nextMode === 'auto' ? 'fast' : nextMode,
        domain: 'general',
        model: MODE_OPTIONS.find((m) => m.id === nextMode)?.modelHint || 'qwen3.5:4b',
        latencyMs: 5,
        createdAt: nowIso,
      };
    }

    const toggleMatch = trimmed.match(/^\/(pro|confirm|websearch)\s+(on|off)$/i);
    if (toggleMatch) {
      const cmd = toggleMatch[1].toLowerCase();
      const on = toggleMatch[2].toLowerCase() === 'on';
      if (cmd === 'pro') await applySettingToggle('pro_enabled', on);
      if (cmd === 'confirm') await applySettingToggle('confirm_risky_actions', on);
      if (cmd === 'websearch') await applySettingToggle('web_search_enabled', on);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Option **/${cmd}** réglée sur **${on ? 'ON' : 'OFF'}**.`,
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 5,
        createdAt: nowIso,
      };
    }

    const ramMatch = trimmed.match(/^\/ram\s+(\d+(?:\.\d+)?)$/i);
    if (ramMatch) {
      const val = Math.max(0, parseFloat(ramMatch[1]));
      await applySettingToggle('pro_min_free_ram_gb', val);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Seuil RAM 9B défini sur **${val.toFixed(1)} Go**.`,
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 5,
        createdAt: nowIso,
      };
    }

    const createTaskMatch =
      trimmed.match(/^\/task\s+(.+)$/i) ||
      trimmed.match(/^(?:crée|cree|ajoute|nouvelle)\s+(?:une\s+)?t[aâ]che\s*:?\s+(.+)$/i);
    if (createTaskMatch) {
      const taskTitle = createTaskMatch[1].trim();
      const todayStr = new Date().toISOString().split('T')[0];
      await addTask({
        title: taskTitle,
        status: 'todo',
        priority: 'high',
        category: 'project',
        dueDate: todayStr,
        tags: ['evris'],
      });
      pulseTransientState('happy', 2800);
      const tool: EvrisExecutedTool = {
        name: 'syntropy_create_task',
        arguments: { title: taskTitle, priority: 'high', dueDate: todayStr },
        result: { ok: true, summary: `Tâche créée : "${taskTitle}"` },
      };
      appendLocalLog('INFO', 'syntropy', `syntropy_create_task : "${taskTitle}"`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Tâche ajoutée dans **Syntropy OS** : **« ${taskTitle} »** (priorité Haute, aujourd'hui).`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 16,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    if (
      lower === '/tasks' ||
      /^(?:quelles sont |liste |affiche |montre )?mes t[aâ]ches/i.test(trimmed)
    ) {
      const pending = tasks.filter((t) => t.status !== 'done');
      const lines =
        pending.length === 0
          ? 'Aucune tâche en attente dans Syntropy OS.'
          : pending
              .slice(0, 10)
              .map((t, i) => `${i + 1}. **${t.title}** _(${t.priority}${t.dueDate ? ` • ${t.dueDate}` : ''})_`)
              .join('\n');
      const tool: EvrisExecutedTool = {
        name: 'syntropy_list_tasks',
        arguments: { status: 'pending' },
        result: { ok: true, summary: `${pending.length} tâche(s) active(s)` },
      };
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Vous avez **${pending.length} tâche(s)** en attente :\n\n${lines}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 12,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    const createNoteMatch =
      trimmed.match(/^\/note\s+(.+)$/i) ||
      trimmed.match(/^(?:crée|cree|ajoute|nouvelle)\s+(?:une\s+)?note\s*:?\s+(.+)$/i);
    if (createNoteMatch) {
      const payload = createNoteMatch[1].trim();
      const [rawTitle, ...rest] = payload.split('::');
      const noteTitle = rawTitle.trim();
      const noteBody = rest.length > 0 ? rest.join('::').trim() : '';
      await addNote({
        title: noteTitle,
        content: `# ${noteTitle}\n\n${noteBody}\n`,
        category: 'resource',
        tags: ['evris'],
        isPinned: false,
      });
      pulseTransientState('happy', 2800);
      const tool: EvrisExecutedTool = {
        name: 'syntropy_create_note',
        arguments: { title: noteTitle },
        result: { ok: true, summary: `Note créée : "${noteTitle}"` },
      };
      appendLocalLog('INFO', 'syntropy', `syntropy_create_note : "${noteTitle}"`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Note enregistrée dans **Syntropy OS** : **« ${noteTitle} »**${noteBody ? `\n\n> ${noteBody}` : '.'}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 18,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    const notesQueryMatch =
      trimmed.match(/^\/notes(?:\s+(.+))?$/i) ||
      trimmed.match(/^(?:liste|affiche|montre|cherche dans)\s+mes notes(?:\s+(.+))?$/i);
    if (notesQueryMatch) {
      const q = (notesQueryMatch[1] || '').trim().toLowerCase();
      const matched = q
        ? notes.filter(
            (n) =>
              n.title.toLowerCase().includes(q) ||
              (n.content || '').toLowerCase().includes(q) ||
              (n.tags || []).some((tg) => tg.toLowerCase().includes(q))
          )
        : notes;
      const lines =
        matched.length === 0
          ? q
            ? `Aucune note trouvée pour « ${q} ».`
            : 'Aucune note enregistrée.'
          : matched
              .slice(0, 8)
              .map((n, i) => `${i + 1}. **${n.title}** _(${n.category})_`)
              .join('\n');
      const tool: EvrisExecutedTool = {
        name: 'syntropy_list_notes',
        arguments: { query: q || '*' },
        result: { ok: true, summary: `${matched.length} note(s)` },
      };
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: q
          ? `**${matched.length} note(s)** correspondent à « ${q} » :\n\n${lines}`
          : `Vos **${notes.length} note(s)** récentes :\n\n${lines}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 14,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    if (lower === '/memories') {
      const lines =
        memories.length === 0
          ? 'Aucune mémoire enregistrée.'
          : memories.map((m) => `- **#${m.id}** [${m.category}] ${m.content}`).join('\n');
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `**Mémoires long terme (${memories.length})** :\n\n${lines}`,
        tier: 'fast',
        domain: 'general',
        model: 'evris-memory',
        latencyMs: 7,
        createdAt: nowIso,
      };
    }

    if (lower === '/status') {
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: [
          `### État E.V.R.I.S. (${backendConnected ? 'En ligne' : 'Pont local'})`,
          `- **Mode** : \`${routingMode.toUpperCase()}\` • **CPU** : ${telemetry.cpu_percent}% • **RAM libre** : ${telemetry.ram_free_gb} Go`,
          `- **Syntropy OS** : ${syntropyContext.pendingTasksCount} tâches actives • ${syntropyContext.notesCount} notes • ${memories.length} mémoires`,
        ].join('\n'),
        tier: 'fast',
        domain: 'general',
        model: 'evris-telemetry',
        latencyMs: 6,
        createdAt: nowIso,
      };
    }

    return null;
  };

  // Envoi d'un message
  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isSending) return;

    resetSleepTimer();
    setManualPreviewState(null);
    setIsTyping(false);
    setInput('');

    if (text.toLowerCase() === '/clear') {
      setMessages([]);
      appendLocalLog('INFO', 'chat', 'Conversation réinitialisée.');
      return;
    }

    const nowIso = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: text, createdAt: nowIso },
    ]);
    setIsSending(true);

    // 1. Commandes locales
    const localReply = await tryHandleLocalCommand(text);
    if (localReply) {
      setMessages((prev) => [...prev, localReply]);
      setIsSending(false);
      if (!localReply.executedTools?.some((t) => t.name.includes('create'))) {
        pulseTransientState('speaking', 1600);
      }
      return;
    }

    // 2. Backend FastAPI / WebSocket
    const assistantId = `ast-${Date.now()}`;
    const startedAt = performance.now();
    let tokenCount = 0;
    let firstTokenAt: number | null = null;
    const liveTools: EvrisExecutedTool[] = [];

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        tier: routingMode === 'auto' ? 'fast' : routingMode,
        domain: 'general',
        model: MODE_OPTIONS.find((m) => m.id === routingMode)?.modelHint || 'qwen3.5:4b',
        executedTools: [],
        createdAt: nowIso,
        isStreaming: true,
      },
    ]);
    setLiveStatusLine('Routage du noyau...');

    const sentOk = await sendEvrisBackendMessage(
      apiUrl,
      text,
      injectSyntropyContext ? syntropyContext : null,
      {
        onStatus: (msg, tier, model) => {
          setLiveStatusLine(msg);
          if (tier || model) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, tier: (tier as EvrisTier) || m.tier, model: model || m.model }
                  : m
              )
            );
          }
        },
        onTierSwitch: (tier, model, msg) => {
          setLiveStatusLine(msg);
          appendLocalLog('INFO', 'router', msg);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, tier: tier as EvrisTier, model, content: '' } : m
            )
          );
        },
        onToolStart: (name) => {
          setLiveStatusLine(`Outil ${name}...`);
        },
        onToolEnd: (name, args, result) => {
          liveTools.push({ name, arguments: args, result });
          appendLocalLog(
            result?.ok ? 'INFO' : 'WARN',
            'tool',
            `${name} → ${result?.summary || result?.error || 'ok'}`
          );
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, executedTools: [...liveTools] } : m))
          );
        },
        onToken: (_delta, fullText) => {
          if (firstTokenAt === null) {
            firstTokenAt = performance.now();
            setIsStreamingTokens(true);
          }
          tokenCount += 1;
          const elapsedS = Math.max(0.05, (performance.now() - firstTokenAt) / 1000);
          const tps = Math.round(tokenCount / elapsedS);
          setLiveStatusLine(`${tps} tok/s`);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: fullText, tokensPerSec: tps, isStreaming: true }
                : m
            )
          );
        },
        onApprovalRequest: (req) => {
          setApprovals((prev) => [req, ...prev]);
          setActiveApproval(req);
          appendLocalLog('WARN', 'security', `Approbation requise : ${req.tool} (${req.target})`);
        },
        onDone: (payload) => {
          const latencyMs = payload.latency_ms ?? Math.round(performance.now() - startedAt);
          setBackendConnected(true);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: payload.content || m.content,
                    tier: (payload.tier_used as EvrisTier) || m.tier,
                    domain: (payload.domain as EvrisDomain) || m.domain,
                    model: payload.model_used || m.model,
                    latencyMs,
                    executedTools:
                      Array.isArray(payload.executed_tools) && payload.executed_tools.length > 0
                        ? payload.executed_tools
                        : m.executedTools,
                    isStreaming: false,
                  }
                : m
            )
          );
          pulseTransientState('speaking', 1500);
        },
        onError: (errMsg) => {
          pulseTransientState('error', 3500);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: errMsg, tier: 'refused', isStreaming: false }
                : m
            )
          );
        },
      }
    );

    if (!sentOk) {
      setBackendConnected(false);
      pulseTransientState('error', 3500);
      const latencyMs = Math.round(performance.now() - startedAt);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                tier: 'refused',
                domain: 'general',
                model: 'offline-bridge',
                latencyMs,
                isStreaming: false,
                content:
                  `Le serveur local **E.V.R.I.S.** (\`${apiUrl}\`) n'est pas encore démarré.\n\n` +
                  `En attendant, les commandes **Syntropy OS** répondent instantanément ici :\n` +
                  `- \`/tasks\` ou \`/task <titre>\`\n` +
                  `- \`/notes\` ou \`/note <titre> :: <contenu>\`\n` +
                  `- \`/status\`, \`/memories\`, \`/help\``,
              }
            : m
        )
      );
      appendLocalLog('WARN', 'bridge', `Serveur FastAPI hors ligne (${apiUrl}).`);
    }

    setIsStreamingTokens(false);
    setLiveStatusLine('');
    setIsSending(false);
  };

  // Mémoires
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMemContent.trim();
    if (!content) return;
    const category = newMemCategory.trim() || 'general';
    if (backendConnected) {
      const created = await createEvrisMemory(apiUrl, category, content);
      if (created) {
        setMemories((prev) => [created, ...prev]);
        setNewMemContent('');
        pulseTransientState('happy', 2000);
        appendLocalLog('INFO', 'memory', `Mémoire #${created.id} enregistrée.`);
        return;
      }
    }
    const nextId = memories.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    setMemories((prev) => [
      {
        id: nextId,
        category,
        content,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      },
      ...prev,
    ]);
    setNewMemContent('');
    pulseTransientState('happy', 2000);
    appendLocalLog('INFO', 'memory', `Mémoire locale #${nextId} ajoutée.`);
  };

  const handleDeleteMemory = async (id: number | 'all') => {
    if (backendConnected) await deleteEvrisMemory(apiUrl, id);
    if (id === 'all') {
      setMemories([]);
      appendLocalLog('INFO', 'memory', 'Toutes les mémoires ont été effacées.');
    } else {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
  };

  // Approvals
  const handleApprovalDecision = async (req: EvrisApprovalRequest, approved: boolean) => {
    setApprovals((prev) => prev.filter((a) => a.id !== req.id));
    setActiveApproval(null);
    if (!req.isDemo && backendConnected) {
      await resolveEvrisApproval(apiUrl, req.id, approved);
    }
    pulseTransientState(approved ? 'happy' : 'error', 2600);
    appendLocalLog(
      approved ? 'INFO' : 'WARN',
      'security',
      `${req.tool}(${req.target}) ${approved ? 'AUTORISÉ' : 'REFUSÉ'}.`
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `appr-res-${Date.now()}`,
        role: 'assistant',
        content: approved
          ? `Action **${req.tool}** (\`${req.target}\`) autorisée.`
          : `Action **${req.tool}** (\`${req.target}\`) refusée par sécurité.`,
        tier: approved ? 'fast' : 'refused',
        domain: 'general',
        model: 'approval-guard',
        latencyMs: 10,
        createdAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const triggerDemoApproval = () => {
    const demo: EvrisApprovalRequest = {
      id: `demo-${Date.now()}`,
      tool: 'open_application',
      target: 'powershell.exe',
      reason: 'Exécutable système sensible détecté par classify_launch_risk()',
      createdAt: new Date().toLocaleTimeString('fr-FR'),
      isDemo: true,
    };
    setApprovals((prev) => [demo, ...prev]);
    setActiveApproval(demo);
  };

  const activeModelChip =
    MODE_OPTIONS.find((m) => m.id === routingMode)?.modelHint || 'qwen3.5:4b / 9b';
  const filteredLogs =
    logLevelFilter === 'ALL' ? logs : logs.filter((l) => l.level === logLevelFilter);

  const surfacePanel = isNothing
    ? 'bg-[#09090b] border-white/15'
    : isCyberpunk
    ? 'bg-[#0a1020]/90 border-[#FCEE0A]/25'
    : isDark
    ? 'bg-zinc-900/55 border-zinc-800/80 backdrop-blur-xl'
    : 'bg-white/85 border-zinc-200 shadow-xs backdrop-blur-xl';

  if (isDesktopApp === false) {
    return (
      <div className="flex flex-col flex-1 h-full min-h-0 w-full items-center justify-center p-6 overflow-y-auto">
        <div
          className={`w-full max-w-lg p-8 rounded-3xl border text-center space-y-6 ${surfacePanel}`}
        >
          <div className="flex justify-center">
            <EvrisArcCore state="sleep" size={168} brightness={arcBrightness} framed />
          </div>

          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Laptop className="w-3.5 h-3.5" />
              Application Desktop uniquement
            </span>
            <h1
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                isNothing ? 'font-ndot tracking-wider' : ''
              }`}
            >
              E.V.R.I.S. n&apos;est pas disponible sur navigateur pour le moment
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
              E.V.R.I.S. est uniquement disponible sur l&apos;application Desktop{' '}
              <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>Syntropy OS</strong>{' '}
              afin de communiquer directement avec vos modèles IA locaux.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <a
              href="https://github.com/Neysann/second-brain-os/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all ${
                isNothing
                  ? 'bg-white text-black hover:bg-zinc-200'
                  : isCyberpunk
                  ? 'bg-[#FCEE0A] text-black'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Télécharger l&apos;application Windows (v{APP_VERSION})</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden"
      onMouseDown={resetSleepTimer}
    >
      {/* BARRE SUPÉRIEURE ÉPURÉE (1 seule ligne, zéro surcharge) */}
      <header
        className={`flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b flex-shrink-0 ${
          isDark ? 'border-zinc-800/70 bg-zinc-950/60' : 'border-zinc-200/80 bg-white/80'
        } backdrop-blur-xl`}
      >
        {/* Identité + État temps réel du noyau */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all duration-300"
            style={{
              backgroundColor: coreMeta.color,
              boxShadow: `0 0 10px ${coreMeta.color}`,
            }}
          />
          <span
            className={`text-sm font-black tracking-[0.2em] uppercase ${
              isNothing ? 'font-ndot' : isCyberpunk ? 'font-mono text-[#FCEE0A]' : ''
            }`}
          >
            E.V.R.I.S.
          </span>
          <span
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
              isDark
                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
          >
            <span style={{ color: coreMeta.color }}>{coreMeta.icon}</span>
            <span>{coreMeta.name}</span>
          </span>
          <span
            className={`hidden md:inline-flex items-center gap-1 text-[10px] font-mono ${
              backendConnected ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {backendConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {backendConnected ? 'ONLINE' : 'LOCAL'}
          </span>
        </div>

        {/* Contrôles discrets à droite */}
        <div className="flex items-center gap-2">
          {/* Sélecteur compact des 4 modes */}
          <div
            className={`hidden sm:inline-flex items-center p-0.5 rounded-xl border gap-0.5 ${
              isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}
          >
            {MODE_OPTIONS.map((m) => {
              const active = routingMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => applyMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    active
                      ? isNothing
                        ? 'bg-white text-black'
                        : isCyberpunk
                        ? 'bg-[#FCEE0A] text-black'
                        : 'bg-purple-600 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                  title={m.modelHint}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Alerte ApprovalBell (discrète sauf si alerte active) */}
          {approvals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveApproval(approvals[0])}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border bg-amber-500/20 border-amber-500/45 text-amber-300 animate-pulse flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{approvals.length}</span>
            </button>
          )}

          {/* Nouvelle conversation */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                resetSleepTimer();
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
              title="Nouvelle conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Bouton Panneau Système (Tiroir latéral) */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              drawerOpen
                ? isNothing
                  ? 'bg-white text-black border-white'
                  : 'bg-purple-600 text-white border-purple-600'
                : isDark
                ? 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:text-white'
                : 'bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950'
            }`}
            title="Noyau ARC, Télémétrie, Mémoires, Logs & Connexion"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Système</span>
          </button>
        </div>
      </header>

      {/* CORPS PRINCIPAL : PRÉSENCE + CONVERSATION */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Colonne de Présence continue (visible sur desktop dès qu'une conversation est active) */}
        {messages.length > 0 && (
          <aside
            className={`hidden lg:flex flex-col items-center justify-between w-64 flex-shrink-0 p-5 border-r ${
              isDark ? 'border-zinc-800/70 bg-zinc-950/35' : 'border-zinc-200/80 bg-zinc-50/60'
            }`}
          >
            <div className="w-full flex flex-col items-center text-center space-y-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                Noyau ARC · 25×25
              </div>

              <EvrisArcCore
                state={effectiveCoreState}
                size={164}
                brightness={arcBrightness}
                framed
              />

              <div className="space-y-1 px-1">
                <div className="text-sm font-bold flex items-center justify-center gap-1.5">
                  <span style={{ color: coreMeta.color }}>{coreMeta.icon}</span>
                  <span>{coreMeta.title}</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  {liveStatusLine || coreMeta.detail}
                </p>
              </div>
            </div>

            {/* Indicateurs compacts en bas de la colonne présence */}
            <div className="w-full space-y-2.5 pt-4 border-t border-zinc-800/40">
              <button
                type="button"
                onClick={handleToggleEvrisConnection}
                disabled={isCheckingBackend}
                className={`w-full px-3 py-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition-all cursor-pointer disabled:opacity-60 ${
                  backendConnected
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/35 hover:text-rose-300'
                    : isNothing
                    ? 'bg-white text-black border-white hover:bg-zinc-200'
                    : isCyberpunk
                    ? 'bg-[#FCEE0A] text-black border-[#FCEE0A]'
                    : isDark
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                }`}
                title={
                  backendConnected
                    ? 'Couper la connexion avec E.V.R.I.S.'
                    : `Démarrer la connexion avec E.V.R.I.S. (${apiUrl})`
                }
              >
                <span className="flex items-center gap-1.5">
                  <Power className={`w-3.5 h-3.5 ${isCheckingBackend ? 'animate-spin' : ''}`} />
                  {isCheckingBackend
                    ? 'Connexion...'
                    : backendConnected
                    ? 'Arrêter EVRIS'
                    : 'Démarrer EVRIS'}
                </span>
                <span className="font-mono text-[10px]">
                  {backendConnected ? 'ON' : 'OFF'}
                </span>
              </button>

              <div
                className={`px-3 py-2 rounded-xl border text-[10px] font-mono space-y-1 ${
                  isDark
                    ? 'bg-zinc-900/40 border-zinc-800/70 text-zinc-400'
                    : 'bg-white border-zinc-200 text-zinc-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="text-zinc-500">Modèle</span>
                  <span className="truncate max-w-[125px]">{activeModelChip}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Contexte</span>
                  <span>
                    {syntropyContext.pendingTasksCount}T · {syntropyContext.notesCount}N
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mémoires</span>
                  <span>{memories.length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Zone principale (Écran d'accueil centré OU fil de discussion + compositeur) */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Mini bandeau ARC sur mobile/tablette quand la conversation est active */}
          {messages.length > 0 && (
            <div
              className={`flex lg:hidden items-center gap-3 px-4 py-2 border-b flex-shrink-0 ${
                isDark ? 'border-zinc-800/60 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/70'
              }`}
            >
              <EvrisArcCore
                state={effectiveCoreState}
                size={42}
                brightness={arcBrightness}
                framed
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">{coreMeta.title}</div>
                <div className="text-[11px] text-zinc-500 truncate">
                  {liveStatusLine || coreMeta.detail}
                </div>
              </div>
            </div>
          )}

          {/* Flux scrollable */}
          <div
            className={`flex-1 overflow-y-auto px-4 sm:px-8 ${
              messages.length === 0
                ? 'flex flex-col items-center justify-center py-6'
                : 'py-6 space-y-5'
            }`}
          >
            {messages.length === 0 ? (
              /* ÉCRAN D'ACCUEIL — CENTRÉ SUR LE NOYAU ARC 25×25 */
              <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6">
                <EvrisArcCore
                  state={effectiveCoreState}
                  size={196}
                  brightness={arcBrightness}
                  framed
                />

                <div className="space-y-1.5">
                  <h2
                    className={`text-xl sm:text-2xl font-bold tracking-tight ${
                      isNothing ? 'font-ndot tracking-wider' : ''
                    }`}
                  >
                    {coreMeta.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">
                    {liveStatusLine || coreMeta.detail}
                  </p>
                </div>

                {/* Bouton manuel Démarrer / Arrêter EVRIS sur l'écran d'accueil */}
                <button
                  type="button"
                  onClick={handleToggleEvrisConnection}
                  disabled={isCheckingBackend}
                  className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 ${
                    backendConnected
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-300'
                      : isNothing
                      ? 'bg-white text-black border-white hover:bg-zinc-200'
                      : isCyberpunk
                      ? 'bg-[#FCEE0A] text-black border-[#FCEE0A]'
                      : 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300 hover:bg-cyan-500/25 shadow-lg shadow-cyan-500/10'
                  }`}
                >
                  <Power className={`w-4 h-4 ${isCheckingBackend ? 'animate-spin' : ''}`} />
                  <span>
                    {isCheckingBackend
                      ? 'Connexion à EVRIS & modèles...'
                      : backendConnected
                      ? 'EVRIS connecté — Arrêter'
                      : 'Démarrer EVRIS'}
                  </span>
                </button>

                {/* 4 suggestions rapides minimalistes */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => handleSend(q.prompt)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                        isDark
                          ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-cyan-500/45 hover:text-white'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* FIL DE CONVERSATION ÉPURÉ */
              <div className="max-w-3xl w-full mx-auto space-y-5">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      {/* Outils exécutés (badges discrets au-dessus de la réponse) */}
                      {!isUser && msg.executedTools && msg.executedTools.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1.5">
                          {msg.executedTools.map((t, i) => (
                            <span
                              key={`${msg.id}-tool-${i}`}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                isDark
                                  ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                                  : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                              }`}
                            >
                              <Zap className="w-2.5 h-2.5" />
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bulle de message */}
                      <div
                        className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? isNothing
                              ? 'bg-white text-black font-medium'
                              : isCyberpunk
                              ? 'bg-[#FCEE0A] text-black font-semibold'
                              : 'bg-purple-600 text-white'
                            : `${surfacePanel} border`
                        }`}
                      >
                        {msg.content || (
                          <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            {liveStatusLine || 'Réflexion en cours...'}
                          </span>
                        )}
                      </div>

                      {/* Métadonnées & actions au survol */}
                      <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-zinc-500">
                        <span>{msg.createdAt}</span>
                        {!isUser && msg.model && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{msg.model}</span>
                          </>
                        )}
                        {!isUser && typeof msg.latencyMs === 'number' && (
                          <span>({msg.latencyMs} ms)</span>
                        )}
                        {!isUser && !msg.isStreaming && msg.content && (
                          <div className="inline-flex items-center gap-1 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg)}
                              className="p-1 rounded hover:bg-zinc-800/40 cursor-pointer"
                              title="Copier"
                            >
                              {copiedId === msg.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveReplyToNote(msg)}
                              className="px-1.5 py-0.5 rounded hover:bg-zinc-800/40 inline-flex items-center gap-1 cursor-pointer"
                              title="Enregistrer en Note Syntropy OS"
                            >
                              <FileText className="w-3 h-3" />
                              <span>{savedMsgFeedback === `note:${msg.id}` ? 'Note OK' : 'Note'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveReplyToTask(msg)}
                              className="px-1.5 py-0.5 rounded hover:bg-zinc-800/40 inline-flex items-center gap-1 cursor-pointer"
                              title="Créer une Tâche Syntropy OS"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>{savedMsgFeedback === `task:${msg.id}` ? 'Tâche OK' : 'Tâche'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* COMPOSITEUR FLOTTANT EN BAS */}
          <div className="px-4 sm:px-8 pb-4 pt-2 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div
                className={`flex items-end gap-2 p-2 pl-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-zinc-900/80 border-zinc-800 focus-within:border-cyan-500/50'
                    : 'bg-white border-zinc-200 shadow-sm focus-within:border-zinc-400'
                }`}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Parlez à E.V.R.I.S. ou tapez /tasks, /notes, /help..."
                  className="flex-1 bg-transparent resize-none outline-none text-sm py-2 max-h-36 placeholder:text-zinc-500"
                />

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isSending}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                    isNothing
                      ? 'bg-white text-black'
                      : isCyberpunk
                      ? 'bg-[#FCEE0A] text-black'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                  title="Envoyer (Entrée)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-zinc-500">
                <span>
                  Pont Syntropy {injectSyntropyContext ? 'actif' : 'inactif'} ({syntropyContext.pendingTasksCount} tâches · {syntropyContext.notesCount} notes)
                </span>
                <span className="font-mono">{activeModelChip}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TIROIR LATÉRAL SYSTÈME (Noyau ARC, Mémoires, Logs/Outils, Connexion)  */}
      {/* ===================================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className={`relative z-10 w-full max-w-md h-full flex flex-col border-l shadow-2xl ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Header tiroir */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold tracking-wide">Système E.V.R.I.S.</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 mini-onglets dans le tiroir */}
            <div className="grid grid-cols-4 gap-1 p-2 border-b border-zinc-800/50 text-[11px] font-semibold">
              {(
                [
                  { id: 'core' as DrawerTab, label: 'Noyau', icon: Activity },
                  { id: 'memories' as DrawerTab, label: `Mém. (${memories.length})`, icon: Brain },
                  { id: 'system' as DrawerTab, label: 'Logs', icon: Terminal },
                  { id: 'settings' as DrawerTab, label: 'Config', icon: SlidersHorizontal },
                ] as const
              ).map((t) => {
                const Icon = t.icon;
                const active = drawerTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawerTab(t.id)}
                    className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      active
                        ? isNothing
                          ? 'bg-white text-black'
                          : 'bg-purple-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Contenu scrollable du tiroir */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {drawerTab === 'core' && (
                <>
                  {/* Contrôle Luminosité LED */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfacePanel}`}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-cyan-400" />
                        Intensité LED ARC
                      </span>
                      <span className="font-mono text-cyan-400">{arcBrightness} %</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={arcBrightness}
                      onChange={(e) => setArcBrightness(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  {/* Testeur des 8 états du noyau */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfacePanel}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Aperçu des 8 états ARC</span>
                      {manualPreviewState && (
                        <button
                          type="button"
                          onClick={() => setManualPreviewState(null)}
                          className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          Retour auto
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {CORE_STATE_LIST.map((st) => {
                        const info = EVRIS_CORE_STATES[st];
                        const selected = effectiveCoreState === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setManualPreviewState((prev) => (prev === st ? null : st))
                            }
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              selected
                                ? 'border-cyan-400/60 bg-cyan-500/10'
                                : isDark
                                ? 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span style={{ color: info.color }} className="text-sm font-bold">
                                {info.icon}
                              </span>
                              {manualPreviewState === st && (
                                <span className="text-[9px] font-mono text-cyan-400">TEST</span>
                              )}
                            </div>
                            <div className="text-xs font-semibold mt-1">{info.name}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Télémétrie Workstation */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfacePanel}`}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Workstation ({telemetry.hostname})</span>
                      <button
                        type="button"
                        onClick={() => syncBackend(apiUrl, false)}
                        className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isCheckingBackend ? 'animate-spin' : ''}`} />
                        Sync
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/70">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          CPU
                        </div>
                        <div className="text-lg font-bold font-mono mt-1">
                          {telemetry.cpu_percent}%
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/70">
                        <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                          RAM libre
                        </div>
                        <div className="text-lg font-bold font-mono mt-1">
                          {telemetry.ram_free_gb} Go
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono space-y-1 pt-1">
                      <div>FAST : {modelsStatus.fast?.model || 'qwen3.5:4b'}</div>
                      <div>PRO : {modelsStatus.pro?.model || 'qwen3.5:9b'}</div>
                      <div>LIMITLESS : {modelsStatus.limitless?.model || 'qwen3.5-abliterated:9b'}</div>
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'memories' && (
                <>
                  <form onSubmit={handleAddMemory} className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={newMemCategory}
                        onChange={(e) => setNewMemCategory(e.target.value)}
                        className={`px-2.5 py-2 rounded-xl border text-xs ${
                          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        <option value="preference">Préférence</option>
                        <option value="hardware">Matériel</option>
                        <option value="project">Projet</option>
                        <option value="system">Système</option>
                      </select>
                      <input
                        value={newMemContent}
                        onChange={(e) => setNewMemContent(e.target.value)}
                        placeholder="Ajouter un fait mémorisé..."
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
                          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{memories.length} mémoire(s)</span>
                      {memories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory('all')}
                          className="text-rose-400 hover:underline cursor-pointer"
                        >
                          Tout effacer
                        </button>
                      )}
                    </div>
                    {memories.map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-2 text-xs ${surfacePanel}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-mono text-[10px]">
                            {m.category}
                          </span>
                          <p className="leading-relaxed">{m.content}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(m.id)}
                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {drawerTab === 'system' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Journal (evris.log)</span>
                    <div className="flex gap-1">
                      {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLogLevelFilter(lvl)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                            logLevelFilter === lvl
                              ? 'bg-purple-600 text-white'
                              : 'text-zinc-500 hover:text-zinc-200'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto font-mono text-[11px]">
                    {filteredLogs.slice().reverse().map((l) => (
                      <div
                        key={l.id}
                        className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60"
                      >
                        <span className="text-zinc-500">{l.timestamp}</span>{' '}
                        <span
                          className={
                            l.level === 'ERROR'
                              ? 'text-rose-400'
                              : l.level === 'WARN'
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                          }
                        >
                          [{l.level}]
                        </span>{' '}
                        <span>{l.message}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="text-xs font-semibold">
                      Outils disponibles ({EVRIS_TOOL_CATALOG.length})
                    </div>
                    <div className="space-y-1.5">
                      {EVRIS_TOOL_CATALOG.map((t) => (
                        <div
                          key={t.name}
                          className="p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs"
                        >
                          <div className="font-mono text-cyan-400 text-[11px]">{t.name}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{t.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {drawerTab === 'settings' && (
                <>
                  <div className={`p-4 rounded-2xl border space-y-3 ${surfacePanel}`}>
                    <label className="text-xs font-semibold block">URL Backend FastAPI</label>
                    <div className="flex gap-2">
                      <input
                        value={apiUrlDraft}
                        onChange={(e) => setApiUrlDraft(e.target.value)}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          saveEvrisUrl(apiUrlDraft);
                          setApiUrl(apiUrlDraft);
                          syncBackend(apiUrlDraft, false);
                        }}
                        className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Tester
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border space-y-3 text-xs ${surfacePanel}`}>
                    {[
                      {
                        label: 'Activer modèle PRO (9B)',
                        val: proEnabled,
                        onToggle: () => applySettingToggle('pro_enabled', !proEnabled),
                      },
                      {
                        label: 'Confirmation actions sensibles [Y]/[N]',
                        val: confirmRisky,
                        onToggle: () => applySettingToggle('confirm_risky_actions', !confirmRisky),
                      },
                      {
                        label: 'Recherche Web temps réel',
                        val: webSearchEnabled,
                        onToggle: () => applySettingToggle('web_search_enabled', !webSearchEnabled),
                      },
                    ].map((row) => (
                      <label
                        key={row.label}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span>{row.label}</span>
                        <input
                          type="checkbox"
                          checked={row.val}
                          onChange={row.onToggle}
                          className="accent-cyan-400 w-4 h-4"
                        />
                      </label>
                    ))}

                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Seuil RAM libre (9B)</span>
                        <span className="font-mono text-cyan-400">
                          {ramThresholdGb.toFixed(1)} Go
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={16}
                        step={0.5}
                        value={ramThresholdGb}
                        onChange={(e) =>
                          applySettingToggle('pro_min_free_ram_gb', parseFloat(e.target.value))
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      triggerDemoApproval();
                    }}
                    className="w-full py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold cursor-pointer hover:bg-amber-500/20"
                  >
                    Simuler une alerte ApprovalBell [Y]/[N]
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE APPROVALBELL [Y] / [N]                                         */}
      {/* ===================================================================== */}
      {activeApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
              isDark ? 'bg-zinc-950 border-amber-500/40' : 'bg-white border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Confirmation de sécurité</h3>
                <p className="text-xs text-zinc-500">{activeApproval.createdAt}</p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1.5 text-xs">
              <div>
                <span className="text-zinc-500">Outil : </span>
                <span className="font-mono text-amber-300">{activeApproval.tool}</span>
              </div>
              <div>
                <span className="text-zinc-500">Cible : </span>
                <span className="font-mono">{activeApproval.target}</span>
              </div>
              <p className="text-zinc-400 pt-1">{activeApproval.reason}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleApprovalDecision(activeApproval, false)}
                className="py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-bold cursor-pointer hover:bg-rose-500/20"
              >
                Refuser [N]
              </button>
              <button
                type="button"
                onClick={() => handleApprovalDecision(activeApproval, true)}
                className="py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold cursor-pointer hover:bg-emerald-400"
              >
                Autoriser [Y]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
