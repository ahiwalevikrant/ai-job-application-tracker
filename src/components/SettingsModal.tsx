'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, Link2, PlugZap, Search, Settings, Trash2, Unplug, X } from 'lucide-react';
import { getProviderModelsAction } from '../app/actions';
import { AIProvider, OpenRouterConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: OpenRouterConfig;
  onSave: (newConfig: OpenRouterConfig) => void;
}

const PROVIDERS: Record<AIProvider, { label: string; keyPlaceholder: string; keyUrl: string; keyUrlText: string }> = {
  openrouter: {
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlText: 'openrouter.ai/keys',
  },
  groq: {
    label: 'Groq',
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlText: 'console.groq.com/keys',
  },
};

const FALLBACK_MODELS: Record<AIProvider, Array<{ id: string; name: string }>> = {
  openrouter: [
    { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
    { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
    { id: 'openai/gpt-4.1', name: 'OpenAI GPT-4.1' },
    { id: 'openai/gpt-4.1-mini', name: 'OpenAI GPT-4.1 Mini' },
    { id: 'anthropic/claude-sonnet-4', name: 'Anthropic Claude Sonnet 4' },
    { id: 'anthropic/claude-3.7-sonnet', name: 'Anthropic Claude 3.7 Sonnet' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Meta Llama 3.1 8B Free' },
    { id: 'mistralai/mistral-large', name: 'Mistral Large' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT' },
    { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B' },
  ],
};

const DEFAULT_MODEL: Record<AIProvider, string> = {
  openrouter: 'google/gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
};

export default function SettingsModal({ isOpen, onClose, config, onSave }: SettingsModalProps) {
  const [provider, setProvider] = useState<AIProvider>(config.provider || 'openrouter');
  const [apiKey, setApiKey] = useState(config.apiKeys?.[config.provider] || config.apiKey || '');
  const [model, setModel] = useState(config.models?.[config.provider] || config.model || DEFAULT_MODEL.openrouter);
  const [models, setModels] = useState(FALLBACK_MODELS[provider]);
  const [modelsStatus, setModelsStatus] = useState<'idle' | 'loading' | 'loaded' | 'fallback'>('idle');
  const [modelsMessage, setModelsMessage] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const hasEnvOpenRouterKey = process.env.NEXT_PUBLIC_HAS_ENV_KEY === 'true';
  const isConnected = config.connectedProviders?.[provider] !== false && (apiKey.trim() !== '' || (provider === 'openrouter' && hasEnvOpenRouterKey));

  useEffect(() => {
    if (!isOpen) return;
    const nextProvider = config.provider || 'openrouter';
    setProvider(nextProvider);
    setApiKey(config.apiKeys?.[nextProvider] || config.apiKey || '');
    setModel(config.models?.[nextProvider] || config.model || DEFAULT_MODEL[nextProvider]);
    setModels(FALLBACK_MODELS[nextProvider]);
    setModelsStatus('idle');
    setModelsMessage('');
  }, [config, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setModels(FALLBACK_MODELS[provider]);
    setModelsStatus('idle');
    setModelsMessage('');
    setApiKey(config.apiKeys?.[provider] || '');
    setModel(config.models?.[provider] || DEFAULT_MODEL[provider]);
  }, [provider, isOpen]);

  useEffect(() => {
    if (!isOpen || modelsStatus === 'loaded' || modelsStatus === 'loading') return;
    void loadModels();
  }, [isOpen, provider, modelsStatus]);

  const modelOptions = useMemo(
    () => models.map((item) => ({
      value: item.id,
      label: item.name && item.name !== item.id ? `${item.name} - ${item.id}` : item.id,
    })),
    [models]
  );

  if (!isOpen) return null;

  async function loadModels() {
    if (provider === 'groq' && !apiKey.trim()) {
      setModels(FALLBACK_MODELS.groq);
      setModelsStatus('fallback');
      setModelsMessage('Add a Groq API key to load live Groq models.');
      return;
    }

    setModelsStatus('loading');
    setModelsMessage('');
    const result = await getProviderModelsAction(provider, apiKey.trim() || undefined);

    if (result.success && result.models.length > 0) {
      const mergedModels = [...FALLBACK_MODELS[provider], ...result.models].filter(
        (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
      );
      setModels(mergedModels);
      setModelsStatus('loaded');
      setModelsMessage(`${mergedModels.length} ${PROVIDERS[provider].label} models available.`);
    } else {
      setModels(FALLBACK_MODELS[provider]);
      setModelsStatus('fallback');
      setModelsMessage(result.error || `Using built-in ${PROVIDERS[provider].label} model options.`);
    }
  }

  const saveConfig = (nextConnected = true, nextApiKey = apiKey) => {
    const nextApiKeys = {
      ...(config.apiKeys || {}),
      [provider]: nextApiKey.trim(),
    };
    const nextModels = {
      ...(config.models || {}),
      [provider]: model.trim() || DEFAULT_MODEL[provider],
    };
    const nextConnectedProviders = {
      ...(config.connectedProviders || {}),
      [provider]: nextConnected,
    };

    onSave({
      provider,
      apiKey: nextApiKeys[provider] || '',
      apiKeys: nextApiKeys,
      model: nextModels[provider] || DEFAULT_MODEL[provider],
      models: nextModels,
      connected: nextConnected,
      connectedProviders: nextConnectedProviders,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveConfig(true);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  const handleDisconnect = () => {
    const nextConnectedProviders = {
      ...(config.connectedProviders || {}),
      [provider]: false,
    };

    onSave({
      provider,
      apiKey: config.apiKeys?.[provider] || '',
      apiKeys: config.apiKeys || {},
      model: model.trim() || DEFAULT_MODEL[provider],
      models: {
        ...(config.models || {}),
        [provider]: model.trim() || DEFAULT_MODEL[provider],
      },
      connected: false,
      connectedProviders: nextConnectedProviders,
    });
  };

  const handleDeleteKey = () => {
    setApiKey('');
    const nextApiKeys = { ...(config.apiKeys || {}) };
    delete nextApiKeys[provider];
    const nextConnectedProviders = {
      ...(config.connectedProviders || {}),
      [provider]: false,
    };

    onSave({
      provider,
      apiKey: '',
      apiKeys: nextApiKeys,
      model: model.trim() || DEFAULT_MODEL[provider],
      models: {
        ...(config.models || {}),
        [provider]: model.trim() || DEFAULT_MODEL[provider],
      },
      connected: false,
      connectedProviders: nextConnectedProviders,
    });
  };

  const providerMeta = PROVIDERS[provider];

  return (
    <div className="modal-overlay animate-fade-in" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Settings size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="card-title">Settings</h3>
          </div>
          <button onClick={onClose} className="button-tertiary" style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>AI Provider</label>
            <div style={styles.segmentedControl}>
              {(Object.keys(PROVIDERS) as AIProvider[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setProvider(item);
                  }}
                  style={{
                    ...styles.segmentButton,
                    backgroundColor: provider === item ? 'var(--color-surface-3)' : 'transparent',
                    color: provider === item ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                    borderColor: provider === item ? 'var(--color-hairline-strong)' : 'transparent',
                  }}
                >
                  {PROVIDERS[item].label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.statusRow}>
            <span
              style={{
                ...styles.connectionBadge,
                backgroundColor: isConnected ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                color: isConnected ? 'var(--color-success)' : 'var(--color-warning)',
                borderColor: isConnected ? 'rgba(39, 166, 68, 0.2)' : 'rgba(245, 166, 35, 0.2)',
              }}
            >
              <Link2 size={12} />
              {isConnected ? `${providerMeta.label} connected` : `${providerMeta.label} disconnected`}
            </span>
            <button type="button" onClick={handleDisconnect} className="button-secondary" style={styles.compactButton}>
              <Unplug size={14} /> Disconnect
            </button>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>{providerMeta.label} API Key</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'openrouter' && hasEnvOpenRouterKey ? 'Configured in .env (optional override)' : providerMeta.keyPlaceholder}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={styles.eyeButton}
                title={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={styles.keyActions}>
              <a href={providerMeta.keyUrl} target="_blank" rel="noopener noreferrer" className="caption" style={styles.keyLink}>
                Get key from {providerMeta.keyUrlText}
              </a>
              <button type="button" onClick={handleDeleteKey} className="button-danger" style={styles.compactButton}>
                <Trash2 size={14} /> Delete Key
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>AI Model</label>
            <div style={styles.modelWrapper}>
              <Search size={16} style={styles.modelIcon} />
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                list={`${provider}-models`}
                placeholder={`Search or paste any ${providerMeta.label} model id`}
                style={styles.modelInput}
              />
              <datalist id={`${provider}-models`}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
            </div>
            <select value={model} onChange={(e) => setModel(e.target.value)} style={styles.modelSelect}>
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div style={styles.modelStatusRow}>
              <p className="caption">
                {modelsStatus === 'loading' ? `Loading ${providerMeta.label} models...` : modelsMessage || `Using ${providerMeta.label} model options.`}
              </p>
              <button type="button" onClick={() => void loadModels()} className="button-secondary" style={styles.compactButton}>
                Refresh
              </button>
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button type="submit" className="button-primary" style={isSaved ? { backgroundColor: 'var(--color-success)' } : {}}>
              {isSaved ? (
                <>
                  <Check size={16} /> Connected
                </>
              ) : (
                <>
                  <PlugZap size={16} /> Connect
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-lg) var(--spacing-md)',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    width: 'min(520px, 100%)',
    maxWidth: '520px',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-hairline)',
    paddingBottom: 'var(--spacing-sm)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-ink-subtle)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  segmentedControl: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--spacing-xs)',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    padding: '4px',
  },
  segmentButton: {
    height: '34px',
    border: '1px solid',
    borderRadius: 'var(--rounded-sm)',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
  },
  connectionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid',
    borderRadius: 'var(--rounded-pill)',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 500,
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    width: '100%',
  },
  keyActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    marginTop: '4px',
  },
  keyLink: {
    color: 'var(--color-primary)',
    textDecoration: 'underline',
  },
  modelWrapper: {
    position: 'relative',
    display: 'flex',
    width: '100%',
  },
  modelIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--color-ink-tertiary)',
    pointerEvents: 'none',
  },
  modelInput: {
    paddingLeft: '36px',
  },
  modelSelect: {
    marginTop: '6px',
  },
  modelStatusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    marginTop: '4px',
  },
  compactButton: {
    height: '30px',
    padding: '5px 10px',
    fontSize: '12px',
    flexShrink: 0,
  },
  eyeButton: {
    position: 'absolute',
    right: '2px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-ink-subtle)',
    cursor: 'pointer',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline)',
    paddingTop: 'var(--spacing-md)',
  },
};
