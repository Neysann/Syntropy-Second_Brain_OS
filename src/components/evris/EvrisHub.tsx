'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Bot,
  Send,
  Activity,
  Brain,
  Terminal,
  Sliders,
  Bell,
  ShieldAlert,
  Sparkles,
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
  Wifi,
  WifiOff,
  Search,
  Lock,
  Globe,
  RotateCcw,
  X,
  MessageSquare,
  Layers,
} from 'lucide-react';
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
} from '@/lib/evrisClient';

type EvrisTab = 'chat' | 'telemetry' | 'memories' | 'logs' | 'settings';

const MODE_OPTIONS: { id: EvrisRoutingMode; label: string; modelHint: string }[] = [
  { id: 'auto', label: 'AUTO', modelHint: 'qwen3.5:4b / 9b' },
  { id: 'fast', label: 'FAST • 4B', modelHint: 'qwen3.5:4b' },
  { id: 'pro', label: 'PRO • 9B', modelHint: 'qwen3.5:9b' },
  { id: 'limitless', label: 'LIMITLESS', modelHint: 'qwen3.5-abliterated:9b' },
];

const QUICK_PROMPTS: { label: string; prompt: string; badge: string }[] = [
  { label: 'Mes tâches du jour', prompt: '/tasks', badge: 'Syntropy' },
  { label: 'Mes notes récentes', prompt: '/notes', badge: 'Syntropy' },
  { label: 'Créer une tâche', prompt: '/task Finaliser le pont FastAPI EVRIS', badge: 'Action' },
  { label: 'Rapport système PC', prompt: 'Donne-moi un rapport système complet du PC.', badge: 'PC' },
  { label: 'Cours NVDA & calcul', prompt: 'Vérifie le cours de NVDA et calcule 15000 * (1 + 0.08)**10.', badge: 'Finance' },
];

export const EvrisHub: React.FC = () => {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { tasks, notes, projects, addTask, addNote } = useData();
  const { currentStreak } = useDailyLife();

  const isDark = theme === 'dark';
  const isNothing = settings.uiStyle === 'nothing';
  const isCyberpunk = settings.uiStyle === 'cyberpunk';

  const [activeTab, setActiveTab] = useState<EvrisTab>('chat');
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

  const [messages, setMessages] = useState<EvrisMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [liveStatusLine, setLiveStatusLine] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedMsgFeedback, setSavedMsgFeedback] = useState<string | null>(null);

  const [memories, setMemories] = useState<EvrisMemory[]>([]);
  const [newMemCategory, setNewMemCategory] = useState<string>('preference');
  const [newMemContent, setNewMemContent] = useState<string>('');
  const [toolFilter, setToolFilter] = useState<'all' | 'pc' | 'research' | 'memory' | 'syntropy'>('all');

  const [logs, setLogs] = useState<EvrisLogEntry[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const [approvals, setApprovals] = useState<EvrisApprovalRequest[]>([]);
  const [activeApproval, setActiveApproval] = useState<EvrisApprovalRequest | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Construction du contexte temps réel Syntropy OS envoyé à EVRIS
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

  // Chargement initial depuis localStorage
  useEffect(() => {
    const savedUrl = getSavedEvrisUrl();
    setApiUrl(savedUrl);
    setApiUrlDraft(savedUrl);

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
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
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

    appendLocalLog('INFO', 'ui', 'Interface E.V.R.I.S. initialisée dans Syntropy OS.');
  }, [appendLocalLog]);

  // Persistance locale des messages, mémoires et préférences
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

  // Auto-scroll du flux de discussion
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveStatusLine]);

  // Vérification & synchronisation avec le serveur FastAPI local (si démarré)
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
        }
      } else {
        setBackendConnected(false);
        if (!silent) {
          appendLocalLog(
            'WARN',
            'bridge',
            `Backend EVRIS hors ligne (${targetUrl}) — mode interface locale + pont Syntropy actif.`
          );
        }
      }
      if (!silent) setIsCheckingBackend(false);
    },
    [appendLocalLog]
  );

  useEffect(() => {
    syncBackend(apiUrl, true);
    const interval = setInterval(() => syncBackend(apiUrl, true), 15000);
    return () => clearInterval(interval);
  }, [apiUrl, syncBackend]);

  // Helpers de mise à jour des réglages (UI + API si connecté)
  const applyMode = async (mode: EvrisRoutingMode) => {
    setRoutingMode(mode);
    setModelsStatus((prev) => ({ ...prev, routing_mode: mode }));
    appendLocalLog('INFO', 'router', `Mode de routage basculé sur ${mode.toUpperCase()}.`);
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

  // Sauvegarde d'une réponse EVRIS en Note ou Tâche Syntropy OS
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
    appendLocalLog('INFO', 'syntropy', `Réponse enregistrée dans les Notes Syntropy OS (« ${firstLine} »).`);
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
    appendLocalLog('INFO', 'syntropy', `Tâche créée dans Syntropy OS (« ${firstLine} »).`);
    setTimeout(() => setSavedMsgFeedback(null), 1600);
  };

  const handleCopyMessage = (msg: EvrisMessage) => {
    navigator.clipboard?.writeText(msg.content).catch(() => {});
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1400);
  };

  // Gestion locale des commandes Syntropy OS & slash commands EVRIS
  const tryHandleLocalCommand = async (rawText: string): Promise<EvrisMessage | null> => {
    const trimmed = rawText.trim();
    const lower = trimmed.toLowerCase();
    const nowIso = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // 1. /clear
    if (lower === '/clear') {
      setMessages([]);
      appendLocalLog('INFO', 'chat', 'Historique de conversation effacé (mémoires préservées).');
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: 'Historique de conversation effacé. Les mémoires long terme restent intactes.',
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 5,
        createdAt: nowIso,
      };
    }

    // 2. /help
    if (lower === '/help' || lower === '/commands') {
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: [
          '### Commandes E.V.R.I.S. & Pont Syntropy OS',
          '- `/mode auto|fast|pro|limitless` — Changer de tier de routage (4B / 9B / Abliterated)',
          '- `/task <titre>` — Créer immédiatement une tâche dans Syntropy OS',
          '- `/tasks` — Afficher vos tâches actives Syntropy OS',
          '- `/note <titre> :: <contenu>` — Créer immédiatement une note Markdown dans Syntropy OS',
          '- `/notes [mot-clé]` — Lister ou rechercher dans vos notes Syntropy OS',
          '- `/pro on|off` • `/confirm on|off` • `/websearch on|off` • `/ram <go>`',
          '- `/memories` • `/status` • `/clear`',
        ].join('\n'),
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 4,
        createdAt: nowIso,
      };
    }

    // 3. /mode <m>
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
        latencyMs: 6,
        createdAt: nowIso,
      };
    }

    // 4. /pro, /confirm, /websearch, /ram
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
        latencyMs: 6,
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
        content: `Garde-fou RAM pour les modèles 9B défini sur **${val.toFixed(1)} Go** minimum.`,
        tier: 'fast',
        domain: 'general',
        model: 'evris-local-ui',
        latencyMs: 5,
        createdAt: nowIso,
      };
    }

    // 5. Pont Syntropy OS — Créer une tâche (/task ou langage naturel)
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
      const tool: EvrisExecutedTool = {
        name: 'syntropy_create_task',
        arguments: { title: taskTitle, priority: 'high', dueDate: todayStr },
        result: { ok: true, summary: `Tâche créée : "${taskTitle}"` },
      };
      appendLocalLog('INFO', 'syntropy', `Outil syntropy_create_task exécuté : "${taskTitle}"`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Tâche ajoutée à votre espace **Syntropy OS** : **« ${taskTitle} »** (priorité Haute, échéance aujourd'hui).`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 18,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    // 6. Pont Syntropy OS — Lister les tâches (/tasks ou langage naturel)
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
        result: { ok: true, summary: `${pending.length} tâche(s) active(s) trouvée(s)` },
      };
      appendLocalLog('INFO', 'syntropy', `Outil syntropy_list_tasks exécuté (${pending.length} tâches).`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Vous avez **${pending.length} tâche(s)** en attente dans Syntropy OS :\n\n${lines}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 12,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    // 7. Pont Syntropy OS — Créer une note (/note ou langage naturel)
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
      const tool: EvrisExecutedTool = {
        name: 'syntropy_create_note',
        arguments: { title: noteTitle },
        result: { ok: true, summary: `Note créée : "${noteTitle}"` },
      };
      appendLocalLog('INFO', 'syntropy', `Outil syntropy_create_note exécuté : "${noteTitle}"`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `Note enregistrée dans **Syntropy OS** : **« ${noteTitle} »**${noteBody ? `\n\n> ${noteBody}` : '.'}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 22,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    // 8. Pont Syntropy OS — Lister / Rechercher dans les notes
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
            : 'Aucune note enregistrée pour le moment.'
          : matched
              .slice(0, 8)
              .map((n, i) => `${i + 1}. **${n.title}** _(${n.category})_`)
              .join('\n');
      const tool: EvrisExecutedTool = {
        name: 'syntropy_list_notes',
        arguments: { query: q || '*' },
        result: { ok: true, summary: `${matched.length} note(s) trouvée(s)` },
      };
      appendLocalLog('INFO', 'syntropy', `Outil syntropy_list_notes exécuté (${matched.length} résultats).`);
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: q
          ? `**${matched.length} note(s)** correspondent à « ${q} » :\n\n${lines}`
          : `Vos **${notes.length} note(s)** Syntropy OS (aperçu des plus récentes) :\n\n${lines}`,
        tier: 'fast',
        domain: 'syntropy',
        model: 'syntropy-bridge',
        latencyMs: 14,
        executedTools: [tool],
        createdAt: nowIso,
      };
    }

    // 9. /memories
    if (lower === '/memories') {
      const lines =
        memories.length === 0
          ? 'Aucune mémoire long terme enregistrée.'
          : memories.map((m) => `- **#${m.id}** [${m.category}] ${m.content}`).join('\n');
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: `**Mémoires long terme (${memories.length})** :\n\n${lines}`,
        tier: 'fast',
        domain: 'general',
        model: 'evris-memory',
        latencyMs: 8,
        createdAt: nowIso,
      };
    }

    // 10. /status
    if (lower === '/status') {
      return {
        id: `sys-${Date.now()}`,
        role: 'assistant',
        content: [
          `### État E.V.R.I.S. (${backendConnected ? 'Backend connecté' : 'Interface locale'})`,
          `- **Mode actif** : \`${routingMode.toUpperCase()}\` • **Pro** : \`${proEnabled ? 'ON' : 'OFF'}\` • **Confirm** : \`${confirmRisky ? 'ON' : 'OFF'}\` • **WebSearch** : \`${webSearchEnabled ? 'ON' : 'OFF'}\``,
          `- **CPU / RAM** : ${telemetry.cpu_percent}% CPU • ${telemetry.ram_free_gb} Go libre (seuil Pro ≥ ${ramThresholdGb.toFixed(1)} Go)`,
          `- **Pont Syntropy OS** : ${syntropyContext.pendingTasksCount} tâches actives • ${syntropyContext.notesCount} notes • ${memories.length} mémoires`,
        ].join('\n'),
        tier: 'fast',
        domain: 'general',
        model: 'evris-telemetry',
        latencyMs: 7,
        createdAt: nowIso,
      };
    }

    return null;
  };

  // Envoi d'un message
  const handleSend = async (customText?: string) => {
    const text = (customText ?? input).trim();
    if (!text || isSending) return;

    setInput('');
    const nowIso = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: EvrisMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: nowIso,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    // 1. Commandes locales & Pont Syntropy OS (instantané, même hors-ligne)
    const localReply = await tryHandleLocalCommand(text);
    if (localReply) {
      setMessages((prev) => [...prev, localReply]);
      setIsSending(false);
      return;
    }

    // 2. Tentative d'envoi au backend FastAPI / WebSocket d'EVRIS
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
    setLiveStatusLine('Connexion au cœur E.V.R.I.S....');

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
              m.id === assistantId
                ? { ...m, tier: tier as EvrisTier, model, content: '' }
                : m
            )
          );
        },
        onToolStart: (name) => {
          setLiveStatusLine(`Exécution de l'outil ${name}...`);
        },
        onToolEnd: (name, args, result) => {
          liveTools.push({ name, arguments: args, result });
          appendLocalLog(
            result?.ok ? 'INFO' : 'WARN',
            'tool',
            `${name} → ${result?.summary || result?.error || 'terminé'}`
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, executedTools: [...liveTools] } : m
            )
          );
        },
        onToken: (_delta, fullText) => {
          if (firstTokenAt === null) firstTokenAt = performance.now();
          tokenCount += 1;
          const elapsedS = Math.max(0.05, (performance.now() - firstTokenAt) / 1000);
          const tps = Math.round(tokenCount / elapsedS);
          setLiveStatusLine(`Streaming en cours (${tps} tok/s)...`);
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
        },
        onError: (errMsg) => {
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

    // 3. Si le serveur FastAPI n'est pas encore lancé, réponse EVRIS claire & utile
    if (!sentOk) {
      setBackendConnected(false);
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
                  `Le pont serveur local **E.V.R.I.S.** (\`${apiUrl}\`) n'est pas encore démarré — l'interface Syntropy OS est prête à recevoir son flux WebSocket (\`/ws/chat\`) et REST (\`/api/status\`, \`/api/memories\`, \`/api/settings\`, \`/api/logs\`).\n\n` +
                  `En attendant le serveur FastAPI dans \`C:\\Projets\\Evris\\backend\\app\\main.py\`, les commandes **Syntropy OS** fonctionnent déjà en direct ici :\n` +
                  `- \`/tasks\` ou \`/task <titre>\` pour lire et créer vos tâches\n` +
                  `- \`/notes\` ou \`/note <titre> :: <contenu>\` pour lire et créer vos notes\n` +
                  `- \`/mode auto|fast|pro|limitless\`, \`/status\`, \`/memories\`, \`/help\``,
              }
            : m
        )
      );
      appendLocalLog('WARN', 'bridge', `Envoi vers ${apiUrl} impossible (serveur FastAPI non démarré).`);
    }

    setLiveStatusLine('');
    setIsSending(false);
  };

  // Gestion des mémoires (UI + backend)
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
        appendLocalLog('INFO', 'memory', `Mémoire #${created.id} enregistrée dans SQLite.`);
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
    appendLocalLog('INFO', 'memory', `Mémoire locale #${nextId} ajoutée [${category}].`);
  };

  const handleDeleteMemory = async (id: number | 'all') => {
    if (backendConnected) {
      await deleteEvrisMemory(apiUrl, id);
    }
    if (id === 'all') {
      setMemories([]);
      appendLocalLog('INFO', 'memory', 'Toutes les mémoires ont été effacées.');
    } else {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      appendLocalLog('INFO', 'memory', `Mémoire #${id} supprimée.`);
    }
  };

  // Résolution d'une demande ApprovalBell
  const handleApprovalDecision = async (req: EvrisApprovalRequest, approved: boolean) => {
    setApprovals((prev) => prev.filter((a) => a.id !== req.id));
    setActiveApproval(null);
    if (!req.isDemo && backendConnected) {
      await resolveEvrisApproval(apiUrl, req.id, approved);
    }
    appendLocalLog(
      approved ? 'INFO' : 'WARN',
      'security',
      `ApprovalBell : ${req.tool}(${req.target}) ${approved ? 'AUTORISÉ [Y]' : 'REFUSÉ [N]'}.`
    );
    setMessages((prev) => [
      ...prev,
      {
        id: `appr-res-${Date.now()}`,
        role: 'assistant',
        content: approved
          ? `Action **${req.tool}** (\`${req.target}\`) autorisée par l'utilisateur.`
          : `Action **${req.tool}** (\`${req.target}\`) refusée par sécurité.`,
        tier: approved ? 'fast' : 'refused',
        domain: 'general',
        model: 'approval-guard',
        latencyMs: 12,
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

  const tierBadgeClass = (tier?: EvrisTier) => {
    if (tier === 'pro') return 'bg-amber-500/15 text-amber-400 border-amber-500/35';
    if (tier === 'limitless') return 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/35';
    if (tier === 'refused') return 'bg-rose-500/15 text-rose-400 border-rose-500/35';
    return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/35';
  };

  const activeModelChip =
    MODE_OPTIONS.find((m) => m.id === routingMode)?.modelHint || 'qwen3.5:4b / 9b';

  const filteredTools =
    toolFilter === 'all'
      ? EVRIS_TOOL_CATALOG
      : EVRIS_TOOL_CATALOG.filter((t) => t.category === toolFilter);

  const filteredLogs =
    logLevelFilter === 'ALL' ? logs : logs.filter((l) => l.level === logLevelFilter);

  const cardBg = isNothing
    ? 'bg-[#0a0a0c] border-white/15'
    : isCyberpunk
    ? 'bg-[#0b1020]/90 border-[#FCEE0A]/25'
    : isDark
    ? 'glass-card bg-zinc-900/60 border-zinc-800/80'
    : 'bg-white border-zinc-200 shadow-xs';

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen w-full overflow-hidden">
      {/* Top 3px SystemPulse Bar (inspiré hud-mockup.html, adapté aux thèmes Syntropy) */}
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{
          background: isNothing
            ? 'linear-gradient(90deg, #D71920 0%, #ffffff 50%, #D71920 100%)'
            : isCyberpunk
            ? 'linear-gradient(90deg, #FCEE0A 0%, #00F0FF 100%)'
            : 'linear-gradient(90deg, #22d3ee 0%, #fbbf24 50%, #a855f7 100%)',
        }}
      />

      {/* TOPBAR PRINCIPALE */}
      <header
        className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b flex-shrink-0 ${
          isDark ? 'border-zinc-800/80 bg-zinc-950/60' : 'border-zinc-200 bg-white/80'
        } backdrop-blur-xl`}
      >
        {/* Identité E.V.R.I.S. + État de connexion */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${
              isNothing
                ? 'bg-zinc-900 border-white/20 text-white'
                : isCyberpunk
                ? 'bg-[#FCEE0A]/15 border-[#FCEE0A]/50 text-[#FCEE0A]'
                : 'bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-indigo-500/20 border-cyan-500/30 text-cyan-400'
            }`}
          >
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1
                className={`text-sm sm:text-base font-black tracking-widest uppercase ${
                  isNothing ? 'font-ndot' : isCyberpunk ? 'font-mono text-[#FCEE0A]' : ''
                }`}
              >
                E.V.R.I.S.
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                  backendConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {backendConnected ? 'LOCAL ONLINE' : 'UI LOCALE'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate hidden sm:block">
              Qwen 3.5 Multi-Model Router • Pont Syntropy OS actif ({syntropyContext.pendingTasksCount} tâches, {syntropyContext.notesCount} notes)
            </p>
          </div>
        </div>

        {/* Sélecteur des 4 Modes (AUTO / FAST / PRO / LIMITLESS) */}
        <div
          className={`inline-flex items-center p-1 rounded-xl border gap-1 ${
            isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}
        >
          {MODE_OPTIONS.map((m) => {
            const active = routingMode === m.id;
            const activeColors =
              m.id === 'pro'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : m.id === 'limitless'
                ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => applyMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                  active
                    ? activeColors
                    : 'border-transparent text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Contrôles Droite : Contexte Syntropy + ApprovalBell + Modèle actif */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInjectSyntropyContext((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              injectSyntropyContext
                ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                : 'bg-zinc-100 border-zinc-200 text-zinc-500'
            }`}
            title="Injecter le contexte en direct de Syntropy OS (tâches, notes, projets) dans les requêtes EVRIS"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Contexte Syntropy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (approvals.length > 0) setActiveApproval(approvals[0]);
              else triggerDemoApproval();
            }}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              approvals.length > 0
                ? 'bg-amber-500/20 border-amber-500/45 text-amber-300 animate-pulse'
                : isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
            title="ApprovalBell — Confirmations de sécurité pour actions PC sensibles"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ApprovalBell</span>
            {approvals.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {approvals.length}
              </span>
            )}
          </button>

          <span
            className={`hidden lg:inline-flex items-center px-2.5 py-1.5 rounded-xl text-[11px] font-mono border ${
              isDark
                ? 'bg-zinc-900/70 border-zinc-800 text-zinc-400'
                : 'bg-zinc-100 border-zinc-200 text-zinc-600'
            }`}
          >
            {activeModelChip}
          </span>
        </div>
      </header>

      {/* SOUS-NAVIGATION 5 ONGLETS */}
      <nav
        className={`flex items-center justify-between gap-2 px-4 sm:px-6 py-2 border-b flex-shrink-0 overflow-x-auto scrollbar-none ${
          isDark ? 'border-zinc-800/60 bg-zinc-950/30' : 'border-zinc-200/80 bg-zinc-50/70'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'chat' as EvrisTab, label: 'Chat Live', icon: MessageSquare },
              { id: 'telemetry' as EvrisTab, label: 'Télémétrie & Modèles', icon: Activity },
              { id: 'memories' as EvrisTab, label: `Mémoires (${memories.length}) & Outils`, icon: Brain },
              { id: 'logs' as EvrisTab, label: 'Logs (evris.log)', icon: Terminal },
              { id: 'settings' as EvrisTab, label: 'Configuration', icon: Sliders },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? isNothing
                      ? 'bg-white text-black'
                      : isCyberpunk
                      ? 'bg-[#FCEE0A] text-black font-bold'
                      : 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => syncBackend(apiUrl, false)}
          disabled={isCheckingBackend}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all cursor-pointer flex-shrink-0 ${
            isDark
              ? 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'
          }`}
          title="Vérifier la connexion au serveur local EVRIS"
        >
          <RefreshCw className={`w-3 h-3 ${isCheckingBackend ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">{backendConnected ? 'Synchronisé' : 'Reconnecter'}</span>
        </button>
      </nav>

      {/* ===================================================================== */}
      {/* VUE 1 : CHAT LIVE + PONT SYNTROPY OS                                  */}
      {/* ===================================================================== */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.length === 0 ? (
                <div className={`p-6 sm:p-8 rounded-3xl border text-center space-y-5 ${cardBg}`}>
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-amber-500/20 border border-cyan-500/30 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-cyan-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className={`text-lg font-extrabold ${isNothing ? 'font-ndot tracking-wider' : ''}`}>
                      E.V.R.I.S. — Intelligence Locale & Pont Syntropy OS
                    </h2>
                    <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
                      Routage 3 niveaux (<span className="text-cyan-400 font-mono">FAST 4B</span> •{' '}
                      <span className="text-amber-400 font-mono">PRO 9B</span> •{' '}
                      <span className="text-fuchsia-400 font-mono">LIMITLESS</span>), 10 outils PC autonomes et accès direct à vos tâches &amp; notes Syntropy OS.
                    </p>
                  </div>

                  {/* Raccourcis rapides */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.label}
                        type="button"
                        onClick={() => handleSend(qp.prompt)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isDark
                            ? 'bg-zinc-950/70 hover:bg-zinc-800/80 border-zinc-800 text-zinc-200'
                            : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                          {qp.badge}
                        </span>
                        <span>{qp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 border transition-all ${
                          isUser
                            ? isNothing
                              ? 'bg-white text-black border-white font-medium'
                              : isCyberpunk
                              ? 'bg-[#FCEE0A] text-black border-[#FCEE0A] font-semibold'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500/40 shadow-md shadow-purple-900/20'
                            : `${cardBg}`
                        }`}
                      >
                        {/* Traces d'outils exécutés */}
                        {!isUser && msg.executedTools && msg.executedTools.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {msg.executedTools.map((tool, i) => (
                              <span
                                key={`${tool.name}-${i}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                                  tool.result?.ok !== false
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                                title={tool.result?.summary || tool.result?.error}
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>{tool.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Contenu du message */}
                        <div className="text-xs sm:text-[13.5px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content || (msg.isStreaming ? '...' : '')}
                        </div>

                        {/* Métadonnées + Actions rapides Syntropy sur les réponses assistant */}
                        {!isUser && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {msg.tier && (
                                <span
                                  className={`px-1.5 py-0.5 rounded border font-bold uppercase ${tierBadgeClass(
                                    msg.tier
                                  )}`}
                                >
                                  {msg.tier}
                                  {msg.domain ? ` • ${msg.domain.toUpperCase()}` : ''}
                                </span>
                              )}
                              {msg.model && <span>{msg.model}</span>}
                              {typeof msg.latencyMs === 'number' && <span>• {msg.latencyMs} ms</span>}
                              {typeof msg.tokensPerSec === 'number' && msg.tokensPerSec > 0 && (
                                <span>• {msg.tokensPerSec} tok/s</span>
                              )}
                            </div>

                            {!msg.isStreaming && msg.content && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveReplyToNote(msg)}
                                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Enregistrer cette réponse dans les Notes Syntropy OS"
                                >
                                  {savedMsgFeedback === `note:${msg.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <FileText className="w-3 h-3" />
                                  )}
                                  <span>→ Note</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveReplyToTask(msg)}
                                  className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Créer une tâche Syntropy OS à partir de cette réponse"
                                >
                                  {savedMsgFeedback === `task:${msg.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <CheckSquare className="w-3 h-3" />
                                  )}
                                  <span>→ Tâche</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                  title="Copier"
                                >
                                  {copiedId === msg.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {liveStatusLine && (
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 px-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{liveStatusLine}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Barre de saisie (Composer) */}
          <div
            className={`px-4 sm:px-6 py-3 border-t flex-shrink-0 ${
              isDark ? 'border-zinc-800/80 bg-zinc-950/60' : 'border-zinc-200 bg-white/80'
            } backdrop-blur-xl`}
          >
            <div className="max-w-4xl mx-auto">
              <div
                className={`flex items-end gap-2 p-2 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-zinc-900/90 border-zinc-800 focus-within:border-purple-500/50'
                    : 'bg-zinc-50 border-zinc-300 focus-within:border-purple-500'
                }`}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message à E.V.R.I.S. ou commande (/tasks, /task ..., /notes, /note ..., /mode pro, /help)..."
                  className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm outline-none resize-none max-h-36 placeholder:text-zinc-500"
                />
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Vider la conversation (/clear)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={!input.trim() || isSending}
                  onClick={() => handleSend()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer ${
                    isNothing
                      ? 'bg-white text-black hover:bg-zinc-200'
                      : isCyberpunk
                      ? 'bg-[#FCEE0A] text-black hover:brightness-110'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Envoyer</span>
                </button>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1.5 px-1">
                <span>Entrée pour envoyer • Maj+Entrée nouvelle ligne • Tapez /help pour toutes les commandes</span>
                <span>Pont Syntropy OS : {injectSyntropyContext ? 'ACTIF' : 'INACTIF'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VUE 2 : TÉLÉMÉTRIE & MODÈLES QWEN 3.5                                 */}
      {/* ===================================================================== */}
      {activeTab === 'telemetry' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-5">
            {/* Cartes des 3 Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* FAST */}
              <div className={`p-5 rounded-2xl border space-y-2.5 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    FAST Tier
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      modelsStatus.fast.ready
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {modelsStatus.fast.loaded ? 'LOADED' : modelsStatus.fast.ready ? 'READY' : 'STANDBY'}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-cyan-300">{modelsStatus.fast.model}</div>
                <p className="text-xs text-zinc-400">
                  ~3.3 Go VRAM • `keep_alive: 30m` • `think: false`. Réponses instantanées &amp; commandes PC rapides.
                </p>
              </div>

              {/* PRO */}
              <div className={`p-5 rounded-2xl border space-y-2.5 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    PRO Tier
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      modelsStatus.pro.ready
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {modelsStatus.pro.loaded ? 'LOADED' : modelsStatus.pro.ready ? 'RAM OK' : 'STANDBY'}
                  </span>
                </div>
                <div className="text-base font-bold font-mono text-amber-300">{modelsStatus.pro.model}</div>
                <p className="text-xs text-zinc-400">
                  ~6.6 Go VRAM • `keep_alive: 5m`. Finance, Science, Tech, Stratégie &amp; code complexe.
                </p>
              </div>

              {/* LIMITLESS */}
              <div className={`p-5 rounded-2xl border space-y-2.5 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-fuchsia-400 font-bold">
                    LIMITLESS Tier
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      modelsStatus.limitless.ready
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {modelsStatus.limitless.loaded
                      ? 'LOADED'
                      : modelsStatus.limitless.ready
                      ? 'RAM OK'
                      : 'STANDBY'}
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-fuchsia-300 truncate">
                  {modelsStatus.limitless.model}
                </div>
                <p className="text-xs text-zinc-400">
                  ~6.6 Go VRAM • Modèle abliterated sans refus, auto-escalade transparente en mode `AUTO`.
                </p>
              </div>
            </div>

            {/* Garde-fou RAM & Télémétrie Workstation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold">Télémétrie Workstation</span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {telemetry.hostname} • {telemetry.os}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">Charge CPU</span>
                      <span className="font-mono font-bold">{telemetry.cpu_percent} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, telemetry.cpu_percent)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">Mémoire RAM utilisée</span>
                      <span className="font-mono font-bold">
                        {telemetry.ram_used_gb} / {telemetry.ram_total_gb} Go ({telemetry.ram_free_gb} Go libre)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, telemetry.ram_percent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-zinc-400 flex items-center justify-between">
                  <span>Garde-fou 9B (seuil ≥ {ramThresholdGb.toFixed(1)} Go libre)</span>
                  <span
                    className={`font-mono font-bold ${
                      telemetry.ram_free_gb >= ramThresholdGb ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {telemetry.ram_free_gb >= ramThresholdGb ? 'AUTORISÉ' : 'BLOQUÉ'}
                  </span>
                </div>
              </div>

              {/* Pont de données Syntropy OS */}
              <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold">Pont Temps Réel Syntropy OS</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {injectSyntropyContext ? 'SYNCHRONISÉ' : 'EN PAUSE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Tâches actives</div>
                    <div className="text-xl font-black mt-0.5">{syntropyContext.pendingTasksCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Notes Markdown</div>
                    <div className="text-xl font-black mt-0.5">{syntropyContext.notesCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Projets PARA</div>
                    <div className="text-xl font-black mt-0.5">{syntropyContext.projectsCount}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Série Habitudes</div>
                    <div className="text-xl font-black mt-0.5">{syntropyContext.currentStreak} j</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VUE 3 : MÉMOIRES SQLITE & 14 OUTILS AUTONOMES                         */}
      {/* ===================================================================== */}
      {activeTab === 'memories' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Section Mémoires long terme */}
            <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span>Mémoires Long Terme ({memories.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Synchronisées avec `evris_memory.db` dès que le serveur FastAPI est connecté.
                  </p>
                </div>
                {memories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMemory('all')}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                  >
                    Tout effacer (/forget all)
                  </button>
                )}
              </div>

              <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2">
                <select
                  value={newMemCategory}
                  onChange={(e) => setNewMemCategory(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-300'
                  }`}
                >
                  <option value="preference">preference</option>
                  <option value="project">project</option>
                  <option value="finance">finance</option>
                  <option value="hardware">hardware</option>
                  <option value="personal">personal</option>
                </select>
                <input
                  type="text"
                  value={newMemContent}
                  onChange={(e) => setNewMemContent(e.target.value)}
                  placeholder="Ajouter un fait permanent à retenir..."
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-300'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Mémoriser</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        <span className="text-amber-400 font-bold">#{m.id}</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                          {m.category}
                        </span>
                        <span>{m.created_at}</span>
                      </div>
                      <p className="text-xs text-zinc-200 mt-1">{m.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMemory(m.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 cursor-pointer"
                      title={`Supprimer #${m.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Catalogue des 14 Outils */}
            <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Catalogue des Outils Autonomes ({EVRIS_TOOL_CATALOG.length})</span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    10 outils natifs EVRIS (`backend/app/tools/registry.py`) + 4 outils Pont Syntropy OS.
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {(
                    [
                      { id: 'all', label: 'Tous' },
                      { id: 'syntropy', label: 'Syntropy OS' },
                      { id: 'pc', label: 'PC Control' },
                      { id: 'research', label: 'Recherche' },
                      { id: 'memory', label: 'Mémoire' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setToolFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        toolFilter === f.id
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : 'border-white/10 text-zinc-500 hover:text-zinc-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTools.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-300">{tool.name}</span>
                      <div className="flex items-center gap-1.5">
                        {tool.requiresConfirm && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> [y/N]
                          </span>
                        )}
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                          {tool.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">{tool.description}</p>
                    <p className="text-[11px] font-mono text-zinc-500">Ex : {tool.example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VUE 4 : LOGS D'EXÉCUTION (evris.log)                                  */}
      {/* ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLogLevelFilter(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                      logLevelFilter === lvl
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'border-white/10 text-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => syncBackend(apiUrl, false)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualiser</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-rose-400 cursor-pointer"
                >
                  Vider
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#09090d] border border-zinc-800 font-mono text-xs space-y-1.5 min-h-[360px]">
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-500 py-8 text-center">Aucun log à afficher.</div>
              ) : (
                filteredLogs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-600 flex-shrink-0">[{entry.timestamp}]</span>
                    <span
                      className={`font-bold flex-shrink-0 w-12 ${
                        entry.level === 'ERROR'
                          ? 'text-rose-400'
                          : entry.level === 'WARN'
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                      }`}
                    >
                      {entry.level}
                    </span>
                    <span className="text-purple-400 flex-shrink-0">{entry.source}:</span>
                    <span className="text-zinc-300 break-all">{entry.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VUE 5 : CONFIGURATION & CONNEXION FASTAPI                             */}
      {/* ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Connexion Backend FastAPI */}
            <div className={`p-5 rounded-2xl border space-y-3.5 ${cardBg}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {backendConnected ? (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-amber-400" />
                  )}
                  <h2 className="text-sm font-bold">Serveur Local E.V.R.I.S. (FastAPI / WebSocket)</h2>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    backendConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {backendConnected ? 'CONNECTÉ' : 'HORS LIGNE'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={apiUrlDraft}
                  onChange={(e) => setApiUrlDraft(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const saved = saveEvrisUrl(apiUrlDraft);
                    setApiUrl(saved);
                    syncBackend(saved, false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBackend ? 'animate-spin' : ''}`} />
                  <span>Enregistrer &amp; Tester</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] font-mono text-zinc-400 space-y-1">
                <div className="text-zinc-300 font-semibold">Endpoints attendus par l&apos;interface (Phase 1b) :</div>
                <div>• WebSocket streaming : <span className="text-cyan-400">WS /ws/chat</span> (ou fallback <span className="text-cyan-400">POST /api/chat</span>)</div>
                <div>• État &amp; Télémétrie : <span className="text-cyan-400">GET /api/status</span> • Réglages : <span className="text-cyan-400">POST /api/settings</span></div>
                <div>• Mémoires &amp; Logs : <span className="text-cyan-400">GET/POST/DELETE /api/memories</span> • <span className="text-cyan-400">GET /api/logs</span> • <span className="text-cyan-400">POST /api/approvals/{'{id}'}</span></div>
              </div>
            </div>

            {/* Réglages persistants E.V.R.I.S. */}
            <div className={`p-5 rounded-2xl border space-y-4 ${cardBg}`}>
              <h2 className="text-sm font-bold">Paramètres du Routeur &amp; Sécurité</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Pro Node */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold">Nœud PRO (`qwen3.5:9b`)</div>
                    <div className="text-[11px] text-zinc-500">Commande `/pro on|off`</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySettingToggle('pro_enabled', !proEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      proEnabled ? 'bg-amber-500 justify-end' : 'bg-zinc-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>

                {/* Confirm Risky Actions */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold">Confirmation Actions Risquées</div>
                    <div className="text-[11px] text-zinc-500">ApprovalBell [y/N] (`/confirm`)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySettingToggle('confirm_risky_actions', !confirmRisky)}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      confirmRisky ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>

                {/* Web Search */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Recherche Web Live</span>
                    </div>
                    <div className="text-[11px] text-zinc-500">DuckDuckGo / Wikipedia (`/websearch`)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applySettingToggle('web_search_enabled', !webSearchEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                      webSearchEnabled ? 'bg-cyan-500 justify-end' : 'bg-zinc-700 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow" />
                  </button>
                </div>

                {/* Test ApprovalBell */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold">Aperçu ApprovalBell</div>
                    <div className="text-[11px] text-zinc-500">Simuler une confirmation système</div>
                  </div>
                  <button
                    type="button"
                    onClick={triggerDemoApproval}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 cursor-pointer"
                  >
                    Tester
                  </button>
                </div>
              </div>

              {/* Seuil RAM Pro */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Garde-fou RAM libre minimum pour modèles 9B (`/ram`)</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{ramThresholdGb.toFixed(1)} Go</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={16}
                  step={0.5}
                  value={ramThresholdGb}
                  onChange={(e) => applySettingToggle('pro_min_free_ram_gb', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>2.0 Go</span>
                  <span>Recommandé : 5.5 Go</span>
                  <span>16.0 Go</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE APPROVALBELL (Confirmation sécurité actions PC sensibles)      */}
      {/* ===================================================================== */}
      {activeApproval && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-2xl ${
              isDark ? 'bg-zinc-950 border-amber-500/40 text-zinc-100' : 'bg-white border-amber-300 text-zinc-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" />
                <span>ApprovalBell — Confirmation requise</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveApproval(null)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs space-y-1.5 text-zinc-200">
              <div>
                <span className="text-zinc-500">Outil  :</span>{' '}
                <span className="text-cyan-400 font-bold">{activeApproval.tool}</span>
              </div>
              <div>
                <span className="text-zinc-500">Cible  :</span>{' '}
                <span className="text-amber-300">{activeApproval.target}</span>
              </div>
              <div>
                <span className="text-zinc-500">Raison :</span> {activeApproval.reason}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleApprovalDecision(activeApproval, false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-700 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
              >
                Refuser [N]
              </button>
              <button
                type="button"
                onClick={() => handleApprovalDecision(activeApproval, true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black cursor-pointer"
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

export default EvrisHub;
