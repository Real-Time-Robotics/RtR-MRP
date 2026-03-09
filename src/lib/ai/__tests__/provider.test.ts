import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// MOCKS
// =============================================================================

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

import {
  AIProviderService,
  getAIProvider,
  resetAIProvider,
  createSystemMessage,
  createUserMessage,
  createAssistantMessage,
  AIProvider,
  AIMessage,
  AIRequestOptions,
} from '../provider';

// =============================================================================
// SETUP
// =============================================================================

// Save and clear env vars that interfere with tests
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();
  resetAIProvider();
  // Save and clear env API keys to avoid interference
  savedEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  // Restore env vars
  if (savedEnv.OPENAI_API_KEY !== undefined) {
    process.env.OPENAI_API_KEY = savedEnv.OPENAI_API_KEY;
  }
  if (savedEnv.ANTHROPIC_API_KEY !== undefined) {
    process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
  }
});

// =============================================================================
// HELPER
// =============================================================================

function makeService(overrides?: {
  openaiKey?: string;
  anthropicKey?: string;
  openaiModel?: string;
  anthropicModel?: string;
}) {
  return new AIProviderService({
    openai: {
      apiKey: overrides?.openaiKey ?? 'test-openai-key',
      model: overrides?.openaiModel ?? 'gpt-4',
    },
    anthropic: {
      apiKey: overrides?.anthropicKey ?? 'test-anthropic-key',
      model: overrides?.anthropicModel ?? 'claude-3',
    },
  });
}

function openaiOkResponse(content = 'Hello', model = 'gpt-4') {
  return {
    ok: true,
    text: vi.fn(),
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content } }],
      model,
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    }),
  };
}

function anthropicOkResponse(content = 'Hi from Claude', model = 'claude-3') {
  return {
    ok: true,
    text: vi.fn(),
    json: vi.fn().mockResolvedValue({
      content: [{ text: content }],
      model,
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
  };
}

function errorResponse(status = 500, body = 'Internal error') {
  return {
    ok: false,
    status,
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn(),
  };
}

// =============================================================================
// CONSTRUCTOR
// =============================================================================

describe('AIProviderService — constructor', () => {
  it('uses config values when provided', () => {
    const service = makeService();
    const status = service.getStatus();
    expect(status).toHaveLength(2);
    expect(status.every((s) => s.available)).toBe(true);
  });

  it('marks provider unavailable when no API key', () => {
    const service = makeService({ openaiKey: '', anthropicKey: '' });
    const status = service.getStatus();
    expect(status.every((s) => !s.available)).toBe(true);
  });

  it('uses env vars when config not provided', () => {
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'env-key';
    const service = new AIProviderService();
    const stats = service.getStats();
    const openai = stats.find((s) => s.provider === 'openai');
    expect(openai?.available).toBe(true);
    process.env.OPENAI_API_KEY = original;
  });

  it('defaults to correct models', () => {
    const service = new AIProviderService({});
    // Just verify it constructs without error
    expect(service).toBeInstanceOf(AIProviderService);
  });
});

// =============================================================================
// callOpenAI (via chat)
// =============================================================================

describe('AIProviderService — callOpenAI', () => {
  it('calls OpenAI API and returns response', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse('Test response', 'gpt-4'));

    const result = await service.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      provider: 'openai',
    });

    expect(result.content).toBe('Test response');
    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4');
    expect(result.usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });

  it('sends correct headers and body', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());

    await service.chat({
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hi' },
      ],
      temperature: 0.5,
      maxTokens: 1024,
      provider: 'openai',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-openai-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(1024);
    expect(body.messages).toHaveLength(2);
  });

  it('uses default temperature and maxTokens', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());

    await service.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      provider: 'openai',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(2048);
  });

  it('throws on API error', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(401, 'Unauthorized'));

    await expect(
      service.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        provider: 'openai',
      })
    ).rejects.toThrow('All AI providers failed');
  });
});

// =============================================================================
// callAnthropic (via chat)
// =============================================================================

describe('AIProviderService — callAnthropic', () => {
  it('calls Anthropic API and returns response', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(anthropicOkResponse('Claude says hi', 'claude-3'));

    const result = await service.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      provider: 'anthropic',
    });

    expect(result.content).toBe('Claude says hi');
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-3');
    expect(result.usage).toMatchObject({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  });

  it('extracts system message for Anthropic format', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(anthropicOkResponse());

    await service.chat({
      messages: [
        { role: 'system', content: 'Be concise' },
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Bye' },
      ],
      provider: 'anthropic',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.system).toBe('Be concise');
    // system message filtered out, assistant mapped to 'assistant'
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[1].role).toBe('assistant');
    expect(body.messages[2].role).toBe('user');
  });

  it('sends correct Anthropic headers', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(anthropicOkResponse());

    await service.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      provider: 'anthropic',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'test-anthropic-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
  });

  it('throws on Anthropic API error', async () => {
    const service = makeService({ openaiKey: '' });
    mockFetch.mockResolvedValue(errorResponse(429, 'Rate limited'));

    await expect(
      service.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        provider: 'anthropic',
      })
    ).rejects.toThrow('All AI providers failed');
  });
});

// =============================================================================
// FALLBACK LOGIC
// =============================================================================

describe('AIProviderService — fallback', () => {
  it('falls back to anthropic when openai fails', async () => {
    const service = makeService();
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, 'OpenAI down'))
      .mockResolvedValueOnce(anthropicOkResponse('Fallback response'));

    const result = await service.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result.provider).toBe('anthropic');
    expect(result.content).toBe('Fallback response');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws when all providers fail', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(errorResponse(500, 'Down'));

    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }] })
    ).rejects.toThrow('All AI providers failed');
  });

  it('skips providers without API keys', async () => {
    const service = makeService({ openaiKey: '' });
    mockFetch.mockResolvedValue(anthropicOkResponse());

    const result = await service.chat({
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(result.provider).toBe('anthropic');
    // Only one fetch call since openai was skipped
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('throws when forced provider has no key', async () => {
    const service = makeService({ openaiKey: '' });

    await expect(
      service.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        provider: 'openai',
      })
    ).rejects.toThrow('All AI providers failed');
  });
});

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

describe('AIProviderService — circuit breaker', () => {
  it('disables provider after maxErrors', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(500, 'Down'));

    // 3 failures = maxErrors
    for (let i = 0; i < 3; i++) {
      await expect(
        service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
      ).rejects.toThrow();
    }

    const stats = service.getStats();
    const openai = stats.find((s) => s.provider === 'openai');
    expect(openai?.available).toBe(false);
  });

  it('resets error count after successful request', async () => {
    const service = makeService({ anthropicKey: '' });

    // 2 failures
    mockFetch.mockResolvedValueOnce(errorResponse(500, 'Down'));
    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow();

    mockFetch.mockResolvedValueOnce(errorResponse(500, 'Down'));
    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow();

    // Then success
    mockFetch.mockResolvedValueOnce(openaiOkResponse());
    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });

    const stats = service.getStats();
    const openai = stats.find((s) => s.provider === 'openai');
    expect(openai?.errors).toBe(0);
    expect(openai?.available).toBe(true);
  });

  it('recovers after cooldown period', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(500, 'Down'));

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      await expect(
        service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
      ).rejects.toThrow();
    }

    // Simulate cooldown by manipulating the internal lastErrorTime
    // Since we can't directly set the private field, we use Date.now mock
    const originalDateNow = Date.now;
    Date.now = vi.fn().mockReturnValue(originalDateNow() + 120000); // 2 minutes later

    mockFetch.mockResolvedValue(openaiOkResponse());
    const result = await service.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      provider: 'openai',
    });
    expect(result.provider).toBe('openai');

    Date.now = originalDateNow;
  });
});

// =============================================================================
// EVENTS
// =============================================================================

describe('AIProviderService — events', () => {
  it('emits providerAttempt on attempt', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());
    const listener = vi.fn();
    service.on('providerAttempt', listener);

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });
    expect(listener).toHaveBeenCalledWith({ provider: 'openai' });
  });

  it('emits providerSuccess on success', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());
    const listener = vi.fn();
    service.on('providerSuccess', listener);

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', latency: expect.any(Number) })
    );
  });

  it('emits providerFailed on failure', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(500, 'Error'));
    const listener = vi.fn();
    service.on('providerFailed', listener);

    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        error: expect.stringContaining('OpenAI API error'),
        willRetry: false,
      })
    );
  });

  it('emits providerSkipped when provider is unavailable', async () => {
    const service = makeService({ openaiKey: '' });
    mockFetch.mockResolvedValue(anthropicOkResponse());
    const listener = vi.fn();
    service.on('providerSkipped', listener);

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }] });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', reason: expect.any(String) })
    );
  });

  it('emits providerError when recording error', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(500, 'Down'));
    const listener = vi.fn();
    service.on('providerError', listener);

    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow();

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', errorCount: 1 })
    );
  });

  it('willRetry is true when more providers are available', async () => {
    const service = makeService();
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, 'OpenAI fail'))
      .mockResolvedValueOnce(anthropicOkResponse());
    const listener = vi.fn();
    service.on('providerFailed', listener);

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }] });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'openai', willRetry: true })
    );
  });
});

// =============================================================================
// getStatus / getStats
// =============================================================================

describe('AIProviderService — getStatus', () => {
  it('returns status for both providers', () => {
    const service = makeService();
    const status = service.getStatus();
    expect(status).toHaveLength(2);
    expect(status.map((s) => s.provider)).toContain('openai');
    expect(status.map((s) => s.provider)).toContain('anthropic');
  });

  it('updates status after success', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });
    const status = service.getStatus();
    const openai = status.find((s) => s.provider === 'openai');
    expect(openai?.available).toBe(true);
    expect(openai?.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('updates status after failure', async () => {
    const service = makeService({ anthropicKey: '' });
    mockFetch.mockResolvedValue(errorResponse(500, 'Down'));

    await expect(
      service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' })
    ).rejects.toThrow();

    const status = service.getStatus();
    const openai = status.find((s) => s.provider === 'openai');
    expect(openai?.lastError).toContain('OpenAI API error');
  });
});

describe('AIProviderService — getStats', () => {
  it('returns stats for both providers', () => {
    const service = makeService();
    const stats = service.getStats();
    expect(stats).toHaveLength(2);
    stats.forEach((s) => {
      expect(s).toHaveProperty('provider');
      expect(s).toHaveProperty('requests');
      expect(s).toHaveProperty('errors');
      expect(s).toHaveProperty('available');
    });
  });

  it('tracks request count', async () => {
    const service = makeService();
    mockFetch.mockResolvedValue(openaiOkResponse());

    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });
    await service.chat({ messages: [{ role: 'user', content: 'Hi' }], provider: 'openai' });

    const stats = service.getStats();
    const openai = stats.find((s) => s.provider === 'openai');
    expect(openai?.requests).toBe(2);
  });
});

// =============================================================================
// healthCheck
// =============================================================================

describe('AIProviderService — healthCheck', () => {
  it('returns available true when both succeed', async () => {
    const service = makeService();
    mockFetch
      .mockResolvedValueOnce(openaiOkResponse())
      .mockResolvedValueOnce(anthropicOkResponse());

    const result = await service.healthCheck();
    expect(result.openai.available).toBe(true);
    expect(result.openai.latency).toBeGreaterThanOrEqual(0);
    expect(result.anthropic.available).toBe(true);
    expect(result.anthropic.latency).toBeGreaterThanOrEqual(0);
  });

  it('returns error for failed provider', async () => {
    const service = makeService();
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, 'Bad key'))
      .mockResolvedValueOnce(anthropicOkResponse());

    const result = await service.healthCheck();
    expect(result.openai.available).toBe(false);
    expect(result.openai.error).toContain('OpenAI API error');
    expect(result.anthropic.available).toBe(true);
  });

  it('skips provider without API key', async () => {
    const service = makeService({ openaiKey: '', anthropicKey: '' });
    const result = await service.healthCheck();
    expect(result.openai.available).toBe(false);
    expect(result.anthropic.available).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// SINGLETON — getAIProvider / resetAIProvider
// =============================================================================

describe('getAIProvider / resetAIProvider', () => {
  it('returns the same instance on multiple calls', () => {
    const a = getAIProvider({ openai: { apiKey: 'k1', model: 'm1' } });
    const b = getAIProvider({ openai: { apiKey: 'k2', model: 'm2' } });
    expect(a).toBe(b);
  });

  it('returns new instance after reset', () => {
    const a = getAIProvider();
    resetAIProvider();
    const b = getAIProvider();
    expect(a).not.toBe(b);
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe('createSystemMessage', () => {
  it('creates system message', () => {
    const msg = createSystemMessage('You are a helper');
    expect(msg).toEqual({ role: 'system', content: 'You are a helper' });
  });
});

describe('createUserMessage', () => {
  it('creates user message', () => {
    const msg = createUserMessage('Hello');
    expect(msg).toEqual({ role: 'user', content: 'Hello' });
  });
});

describe('createAssistantMessage', () => {
  it('creates assistant message', () => {
    const msg = createAssistantMessage('Hi there');
    expect(msg).toEqual({ role: 'assistant', content: 'Hi there' });
  });
});

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

describe('default export', () => {
  it('exports AIProviderService class as default', async () => {
    const mod = await import('../provider');
    expect(mod.default).toBe(AIProviderService);
  });
});
