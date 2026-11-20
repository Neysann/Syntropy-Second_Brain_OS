export type EvrisRoutingMode = 'auto' | 'fast' | 'pro' | 'limitless';
export type EvrisTier = 'fast' | 'pro' | 'limitless' | 'refused';
export type EvrisDomain = 'general' | 'finance' | 'science' | 'tech' | 'strategy' | 'syntropy';

export interface EvrisHeavyModelStatus {
  model: string;
  installed: boolean;
  loaded: boolean;
  loaded_ram_gb: number;
  effective_free_ram_gb: number;
  ram_ok: boolean;
  ready: boolean;
  block_reason: string | null;
}

export interface EvrisModelsStatus {
  ollama_online: boolean;
  routing_mode: EvrisRoutingMode;
  pro_enabled: boolean;
  confirm_risky_actions: boolean;
  web_search_enabled: boolean;
  free_ram_gb: number;
  effective_free_ram_gb: number;
  pro_min_free_ram_gb: number;
  ram_ok: boolean;
  fast: {
    model: string;
    ready: boolean;
    loaded: boolean;
  };
  pro: EvrisHeavyModelStatus;
  limitless: EvrisHeavyModelStatus;
}

export interface EvrisTelemetry {
  hostname: string;
  os: string;
  cpu_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_free_gb: number;
  ram_percent: number;
  timestamp: string;
}

export interface EvrisMemory {
  id: number;
  category: string;
  content: string;
  created_at: string;
}

export interface EvrisExecutedTool {
  name: string;
  arguments: Record<string, any>;
  result: {
    ok: boolean;
    summary?: string;
    error?: string;
    [key: string]: any;
  };
}

export interface EvrisMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tier?: EvrisTier;
  domain?: EvrisDomain;
  model?: string;
  latencyMs?: number;
  tokensPerSec?: number;
  executedTools?: EvrisExecutedTool[];
  createdAt: string;
  isStreaming?: boolean;
}

export interface EvrisApprovalRequest {
  id: string;
  tool: string;
  target: string;
  reason: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface EvrisLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}

export interface EvrisToolCatalogItem {
  name: string;
  category: 'pc' | 'research' | 'memory' | 'syntropy';
  description: string;
  example: string;
  requiresConfirm?: boolean;
}

export interface EvrisSyntropyContext {
  pendingTasksCount: number;
  topTasks: { id: string; title: string; priority: string; status: string; dueDate?: string }[];
  notesCount: number;
  recentNotes: { id: string; title: string; category: string; tags: string[] }[];
  projectsCount: number;
  activeProjects: { id: string; name: string; status: string }[];
  currentStreak: number;
}
