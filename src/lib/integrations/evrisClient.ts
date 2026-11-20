import {
  EvrisApprovalRequest,
  EvrisLogEntry,
  EvrisMemory,
  EvrisModelsStatus,
  EvrisRoutingMode,
  EvrisSyntropyContext,
  EvrisTelemetry,
  EvrisToolCatalogItem,
} from '@/types/evris';

export const DEFAULT_EVRIS_API_URL = 'http://127.0.0.1:8000';
export const EVRIS_URL_STORAGE_KEY = 'syntropy_evris_api_url';
export const EVRIS_MESSAGES_STORAGE_KEY = 'syntropy_evris_messages_v1';
export const EVRIS_MEMORIES_STORAGE_KEY = 'syntropy_evris_local_memories_v1';
export const EVRIS_SETTINGS_STORAGE_KEY = 'syntropy_evris_local_settings_v1';

export const EVRIS_TOOL_CATALOG: EvrisToolCatalogItem[] = [
  // 10 outils natifs EVRIS (backend/app/tools/registry.py)
  {
    name: 'save_memory',
    category: 'memory',
    description: 'Enregistre un fait permanent, une préférence ou une instruction dans la mémoire SQLite.',
    example: 'Retiens que mon objectif de rendement annuel est 12 %',
  },
  {
    name: 'open_application',
    category: 'pc',
    description: 'Lance toute application Windows installée (alias FR/EN, PATH, Menu Démarrer, Registry) ou URL.',
    example: 'Ouvre Discord / Ouvre la calculatrice',
    requiresConfirm: true,
  },
  {
    name: 'get_system_report',
    category: 'pc',
    description: 'Inspecte la charge CPU, la RAM libre, l’espace disque, la batterie et les processus lourds.',
    example: 'Donne-moi un rapport système complet du PC',
  },
  {
    name: 'read_local_file',
    category: 'pc',
    description: 'Lit et analyse un fichier local (avec garde-fou sur .env, .ssh, clés privées).',
    example: 'Lis README.md et résume son architecture',
    requiresConfirm: true,
  },
  {
    name: 'list_directory',
    category: 'pc',
    description: 'Liste les fichiers et dossiers d’un répertoire local sur le PC.',
    example: 'Liste les fichiers dans C:\\Projets',
  },
  {
    name: 'create_directory',
    category: 'pc',
    description: 'Crée un nouveau dossier local (et ses dossiers parents manquants).',
    example: 'Crée le dossier C:\\Projets\\notes-test',
  },
  {
    name: 'write_local_file',
    category: 'pc',
    description: 'Crée ou écrit un fichier texte/code localement sur le PC.',
    example: 'Écris un script Python de sauvegarde',
    requiresConfirm: true,
  },
  {
    name: 'calculate_math',
    category: 'research',
    description: 'Calculateur scientifique et financier AST sécurisé (sqrt, log, intérêts composés).',
    example: 'Calcule 15000 * (1 + 0.085)**10',
  },
  {
    name: 'get_market_quote',
    category: 'research',
    description: 'Récupère le cours en temps réel et la variation 24h d’une action, indice ou crypto (Yahoo Finance).',
    example: 'Quel est le cours actuel de NVDA et BTC-USD ?',
  },
  {
    name: 'web_search',
    category: 'research',
    description: 'Recherche Web en direct (DuckDuckGo / Wikipedia) pour faits récents et documentations.',
    example: 'Recherche les nouveautés de Python 3.13',
  },
  // 4 outils pont Syntropy OS (actifs immédiatement côté interface)
  {
    name: 'syntropy_list_tasks',
    category: 'syntropy',
    description: 'Consulte les tâches actives et prioritaires de votre espace Syntropy OS.',
    example: '/tasks ou « Quelles sont mes tâches en cours ? »',
  },
  {
    name: 'syntropy_create_task',
    category: 'syntropy',
    description: 'Crée directement une nouvelle tâche dans Syntropy OS depuis le chat EVRIS.',
    example: '/task Préparer le serveur FastAPI EVRIS',
  },
  {
    name: 'syntropy_list_notes',
    category: 'syntropy',
    description: 'Parcourt et recherche dans vos notes Markdown Syntropy OS.',
    example: '/notes ou « Cherche dans mes notes architecture »',
  },
  {
    name: 'syntropy_create_note',
    category: 'syntropy',
    description: 'Enregistre une idée ou une réponse complète d’EVRIS comme note Syntropy OS.',
    example: '/note Idée EVRIS :: Connecter FastAPI en WebSocket',
  },
];

export const DEFAULT_OFFLINE_STATUS: EvrisModelsStatus = {
  ollama_online: false,
  routing_mode: 'auto',
  pro_enabled: true,
  confirm_risky_actions: true,
  web_search_enabled: true,
  free_ram_gb: 16.4,
  effective_free_ram_gb: 16.4,
  pro_min_free_ram_gb: 5.5,
  ram_ok: true,
  fast: {
    model: 'qwen3.5:4b',
    ready: false,
    loaded: false,
  },
  pro: {
    model: 'qwen3.5:9b',
    installed: false,
    loaded: false,
    loaded_ram_gb: 0,
    effective_free_ram_gb: 16.4,
    ram_ok: true,
    ready: false,
    block_reason: 'ollama_offline',
  },
  limitless: {
    model: 'huihui_ai/qwen3.5-abliterated:9b',
    installed: false,
    loaded: false,
    loaded_ram_gb: 0,
    effective_free_ram_gb: 16.4,
    ram_ok: true,
    ready: false,
    block_reason: 'ollama_offline',
  },
};

export function getSavedEvrisUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_EVRIS_API_URL;
  return (localStorage.getItem(EVRIS_URL_STORAGE_KEY) || DEFAULT_EVRIS_API_URL).replace(/\/+$/, '');
}

export function saveEvrisUrl(url: string): string {
  const cleaned = (url || DEFAULT_EVRIS_API_URL).trim().replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    localStorage.setItem(EVRIS_URL_STORAGE_KEY, cleaned);
  }
  return cleaned;
}

function toWebSocketUrl(httpUrl: string): string {
  const clean = httpUrl.replace(/\/+$/, '');
  if (clean.startsWith('https://')) return clean.replace(/^https:\/\//, 'wss://') + '/ws/chat';
  return clean.replace(/^http:\/\//, 'ws://') + '/ws/chat';
}

export interface EvrisBackendStatusPayload {
  connected: boolean;
  status?: EvrisModelsStatus;
  telemetry?: EvrisTelemetry;
  pendingApprovals?: EvrisApprovalRequest[];
  error?: string;
}

export async function fetchEvrisBackendStatus(baseUrl: string): Promise<EvrisBackendStatusPayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);
  try {
    const resp = await fetch(`${baseUrl}/api/status`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!resp.ok) {
      return { connected: false, error: `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return {
      connected: true,
      status: data.models || data.status || data,
      telemetry: data.telemetry,
      pendingApprovals: Array.isArray(data.pending_approvals) ? data.pending_approvals : undefined,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.name === 'AbortError' ? 'Délai dépassé' : 'Serveur local EVRIS non détecté',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEvrisMemories(baseUrl: string): Promise<EvrisMemory[] | null> {
  try {
    const resp = await fetch(`${baseUrl}/api/memories`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return Array.isArray(data) ? data : Array.isArray(data.memories) ? data.memories : null;
  } catch {
    return null;
  }
}

export async function createEvrisMemory(
  baseUrl: string,
  category: string,
  content: string
): Promise<EvrisMemory | null> {
  try {
    const resp = await fetch(`${baseUrl}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, content }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.memory || data;
  } catch {
    return null;
  }
}

export async function deleteEvrisMemory(baseUrl: string, id: number | 'all'): Promise<boolean> {
  try {
    const url = id === 'all' ? `${baseUrl}/api/memories` : `${baseUrl}/api/memories/${id}`;
    const resp = await fetch(url, { method: 'DELETE' });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchEvrisLogs(baseUrl: string, limit = 80): Promise<EvrisLogEntry[] | null> {
  try {
    const resp = await fetch(`${baseUrl}/api/logs?limit=${limit}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const lines: string[] = Array.isArray(data) ? data : Array.isArray(data.lines) ? data.lines : [];
    return lines.map((line, i) => parseLogLine(line, i));
  } catch {
    return null;
  }
}

export function parseLogLine(raw: string, idx: number): EvrisLogEntry {
  const m = raw.match(/^\[?(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)\]?\s+(INFO|WARNING|WARN|ERROR|DEBUG)\s+([^:]+):\s*(.*)$/i);
  if (m) {
    const lvlRaw = m[2].toUpperCase();
    const level: 'INFO' | 'WARN' | 'ERROR' =
      lvlRaw.startsWith('ERR') ? 'ERROR' : lvlRaw.startsWith('WARN') ? 'WARN' : 'INFO';
    return {
      id: `log-${idx}-${m[1]}`,
      timestamp: m[1],
      level,
      source: m[3].trim(),
      message: m[4].trim(),
    };
  }
  return {
    id: `log-${idx}`,
    timestamp: new Date().toLocaleTimeString('fr-FR'),
    level: raw.toLowerCase().includes('error') ? 'ERROR' : raw.toLowerCase().includes('warn') ? 'WARN' : 'INFO',
    source: 'evris',
    message: raw,
  };
}

export async function patchEvrisSettings(
  baseUrl: string,
  patch: Partial<{
    routing_mode: EvrisRoutingMode;
    pro_enabled: boolean;
    confirm_risky_actions: boolean;
    web_search_enabled: boolean;
    pro_min_free_ram_gb: number;
  }>
): Promise<boolean> {
  try {
    const resp = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function resolveEvrisApproval(
  baseUrl: string,
  approvalId: string,
  approved: boolean
): Promise<boolean> {
  try {
    const resp = await fetch(`${baseUrl}/api/approvals/${encodeURIComponent(approvalId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export interface EvrisStreamCallbacks {
  onStatus?: (message: string, tier?: string, model?: string) => void;
  onTierSwitch?: (tier: string, model: string, message: string) => void;
  onToolStart?: (name: string, args: Record<string, any>) => void;
  onToolEnd?: (name: string, args: Record<string, any>, result: any) => void;
  onToken?: (delta: string, fullText: string) => void;
  onApprovalRequest?: (req: EvrisApprovalRequest) => void;
  onDone?: (payload: {
    content: string;
    tier_used?: string;
    domain?: string;
    model_used?: string;
    latency_ms?: number;
    executed_tools?: any[];
  }) => void;
  onError?: (message: string) => void;
}

/**
 * Envoie un message au serveur FastAPI EVRIS en privilégiant WebSocket (/ws/chat)
 * pour le streaming token par token, avec bascule HTTP POST /api/chat en secours.
 */
export async function sendEvrisBackendMessage(
  baseUrl: string,
  message: string,
  syntropyContext: EvrisSyntropyContext | null,
  callbacks: EvrisStreamCallbacks
): Promise<boolean> {
  // 1. Tentative WebSocket temps réel
  const wsResult = await new Promise<'ok' | 'fallback'>((resolve) => {
    let settled = false;
    let receivedAnyEvent = false;
    try {
      const ws = new WebSocket(toWebSocketUrl(baseUrl));
      const openTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { ws.close(); } catch {}
          resolve('fallback');
        }
      }, 2200);

      ws.onopen = () => {
        clearTimeout(openTimeout);
        ws.send(
          JSON.stringify({
            type: 'chat',
            message,
            syntropy_context: syntropyContext,
          })
        );
      };

      ws.onmessage = (evt) => {
        receivedAnyEvent = true;
        try {
          const data = JSON.parse(evt.data);
          const t = data.type;
          if (t === 'status') {
            callbacks.onStatus?.(data.message || '', data.tier, data.model);
          } else if (t === 'tier_switch') {
            callbacks.onTierSwitch?.(data.tier, data.model, data.message || '');
          } else if (t === 'tool_start') {
            callbacks.onToolStart?.(data.name, data.arguments || {});
          } else if (t === 'tool_end') {
            callbacks.onToolEnd?.(data.name, data.arguments || {}, data.result || {});
          } else if (t === 'token') {
            callbacks.onToken?.(data.delta || '', data.text || '');
          } else if (t === 'approval_request') {
            callbacks.onApprovalRequest?.({
              id: data.id || `appr-${Date.now()}`,
              tool: data.tool || 'open_application',
              target: data.target || '',
              reason: data.reason || 'Action système sensible',
              createdAt: new Date().toLocaleTimeString('fr-FR'),
            });
          } else if (t === 'done' || t === 'final') {
            callbacks.onDone?.({
              content: data.content || data.assistant_message?.content || '',
              tier_used: data.tier_used,
              domain: data.domain,
              model_used: data.model_used,
              latency_ms: data.latency_ms,
              executed_tools: data.executed_tools,
            });
            if (!settled) {
              settled = true;
              ws.close();
              resolve('ok');
            }
          } else if (t === 'error') {
            callbacks.onError?.(data.message || 'Erreur WebSocket EVRIS');
            if (!settled) {
              settled = true;
              ws.close();
              resolve('ok');
            }
          }
        } catch {}
      };

      ws.onerror = () => {
        clearTimeout(openTimeout);
        if (!settled) {
          settled = true;
          resolve(receivedAnyEvent ? 'ok' : 'fallback');
        }
      };

      ws.onclose = () => {
        clearTimeout(openTimeout);
        if (!settled) {
          settled = true;
          resolve(receivedAnyEvent ? 'ok' : 'fallback');
        }
      };
    } catch {
      resolve('fallback');
    }
  });

  if (wsResult === 'ok') return true;

  // 2. Fallback HTTP POST /api/chat
  try {
    const resp = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, syntropy_context: syntropyContext }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    callbacks.onDone?.({
      content: data.assistant_message?.content || data.reply || data.content || '',
      tier_used: data.tier_used,
      domain: data.domain,
      model_used: data.model_used,
      latency_ms: data.latency_ms,
      executed_tools: data.executed_tools,
    });
    return true;
  } catch {
    return false;
  }
}
