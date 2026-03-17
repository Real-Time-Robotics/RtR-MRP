// =============================================================================
// AI PROVIDER SERVICE
// Multi-provider AI integration with automatic fallback
// Primary: Anthropic (Claude) | Fallback: OpenAI (GPT-4)
// =============================================================================

import { EventEmitter } from 'events';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type AIProvider = 'openai' | 'anthropic';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  provider?: AIProvider; // Force specific provider
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latency: number;
}

export interface AIProviderConfig {
  openai: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
}

export interface AIProviderStatus {
  provider: AIProvider;
  available: boolean;
  lastError?: string;
  lastCheck: Date;
  responseTime?: number;
}

// =============================================================================
// AI PROVIDER CLASS
// =============================================================================

export class AIProviderService extends EventEmitter {
  private config: AIProviderConfig;
  private providerStatus: Map<AIProvider, AIProviderStatus> = new Map();
  private requestCount: Map<AIProvider, number> = new Map();
  private errorCount: Map<AIProvider, number> = new Map();
  
  // Circuit breaker settings
  private readonly maxErrors = 3;
  private readonly cooldownPeriod = 60000; // 1 minute
  private lastErrorTime: Map<AIProvider, number> = new Map();

  constructor(config?: Partial<AIProviderConfig>) {
    super();
    
    this.config = {
      openai: {
        apiKey: config?.openai?.apiKey || process.env.OPENAI_API_KEY || '',
        model: config?.openai?.model || 'gpt-4-turbo-preview',
        baseUrl: config?.openai?.baseUrl || 'https://api.openai.com/v1',
      },
      anthropic: {
        apiKey: config?.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY || '',
        model: config?.anthropic?.model || 'claude-sonnet-4-20250514',
        baseUrl: config?.anthropic?.baseUrl || 'https://api.anthropic.com/v1',
      },
    };

    // Initialize status
    this.initializeStatus();
  }

  private initializeStatus(): void {
    const providers: AIProvider[] = ['openai', 'anthropic'];
    
    providers.forEach((provider) => {
      this.providerStatus.set(provider, {
        provider,
        available: this.hasApiKey(provider),
        lastCheck: new Date(),
      });
      this.requestCount.set(provider, 0);
      this.errorCount.set(provider, 0);
    });
  }

  private hasApiKey(provider: AIProvider): boolean {
    return !!this.config[provider].apiKey;
  }

  // =============================================================================
  // CIRCUIT BREAKER LOGIC
  // =============================================================================

  private isProviderAvailable(provider: AIProvider): boolean {
    if (!this.hasApiKey(provider)) return false;
    
    const errors = this.errorCount.get(provider) || 0;
    const lastError = this.lastErrorTime.get(provider) || 0;
    
    // Check if in cooldown
    if (errors >= this.maxErrors) {
      const timeSinceError = Date.now() - lastError;
      if (timeSinceError < this.cooldownPeriod) {
        return false; // Still in cooldown
      }
      // Reset after cooldown
      this.errorCount.set(provider, 0);
    }
    
    return true;
  }

  private recordError(provider: AIProvider, error: string): void {
    const currentErrors = (this.errorCount.get(provider) || 0) + 1;
    this.errorCount.set(provider, currentErrors);
    this.lastErrorTime.set(provider, Date.now());
    
    this.providerStatus.set(provider, {
      provider,
      available: currentErrors < this.maxErrors,
      lastError: error,
      lastCheck: new Date(),
    });

    this.emit('providerError', { provider, error, errorCount: currentErrors });
  }

  private recordSuccess(provider: AIProvider, responseTime: number): void {
    this.errorCount.set(provider, 0);
    this.requestCount.set(provider, (this.requestCount.get(provider) || 0) + 1);
    
    this.providerStatus.set(provider, {
      provider,
      available: true,
      lastCheck: new Date(),
      responseTime,
    });
  }

  // =============================================================================
  // OPENAI IMPLEMENTATION
  // =============================================================================

  private async callOpenAI(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now();
    const { apiKey, model, baseUrl } = this.config.openai;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    return {
      content: data.choices[0]?.message?.content || '',
      provider: 'openai',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      latency,
    };
  }

  // =============================================================================
  // ANTHROPIC IMPLEMENTATION
  // =============================================================================

  private async callAnthropic(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now();
    const { apiKey, model, baseUrl } = this.config.anthropic;

    // Convert messages format for Anthropic
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const otherMessages = options.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 2048,
        system: systemMessage?.content || '',
        messages: otherMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    return {
      content: data.content[0]?.text || '',
      provider: 'anthropic',
      model: data.model,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      latency,
    };
  }

  // =============================================================================
  // MAIN CHAT METHOD WITH AUTO-FALLBACK
  // =============================================================================

  async chat(options: AIRequestOptions): Promise<AIResponse> {
    const providers: AIProvider[] = options.provider 
      ? [options.provider]
      : ['anthropic', 'openai']; // Priority: Claude first, OpenAI fallback

    let lastError: Error | null = null;

    for (const provider of providers) {
      if (!this.isProviderAvailable(provider)) {
        this.emit('providerSkipped', { provider, reason: 'Not available or in cooldown' });
        continue;
      }

      try {
        this.emit('providerAttempt', { provider });
        
        let response: AIResponse;
        
        if (provider === 'openai') {
          response = await this.callOpenAI(options);
        } else {
          response = await this.callAnthropic(options);
        }

        this.recordSuccess(provider, response.latency);
        this.emit('providerSuccess', { provider, latency: response.latency });
        
        return response;
        
      } catch (error) {
        lastError = error as Error;
        this.recordError(provider, lastError.message);
        
        this.emit('providerFailed', { 
          provider, 
          error: lastError.message,
          willRetry: providers.indexOf(provider) < providers.length - 1
        });
      }
    }

    // All providers failed
    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  getStatus(): AIProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  getStats(): {
    provider: AIProvider;
    requests: number;
    errors: number;
    available: boolean;
  }[] {
    return (['openai', 'anthropic'] as AIProvider[]).map((provider) => ({
      provider,
      requests: this.requestCount.get(provider) || 0,
      errors: this.errorCount.get(provider) || 0,
      available: this.isProviderAvailable(provider),
    }));
  }

  // Health check
  async healthCheck(): Promise<{
    openai: { available: boolean; latency?: number; error?: string };
    anthropic: { available: boolean; latency?: number; error?: string };
  }> {
    const results = {
      openai: { available: false, latency: undefined as number | undefined, error: undefined as string | undefined },
      anthropic: { available: false, latency: undefined as number | undefined, error: undefined as string | undefined },
    };

    // Test OpenAI
    if (this.hasApiKey('openai')) {
      try {
        const response = await this.callOpenAI({
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5,
        });
        results.openai.available = true;
        results.openai.latency = response.latency;
      } catch (error) {
        results.openai.error = (error as Error).message;
      }
    }

    // Test Anthropic
    if (this.hasApiKey('anthropic')) {
      try {
        const response = await this.callAnthropic({
          messages: [{ role: 'user', content: 'Hi' }],
          maxTokens: 5,
        });
        results.anthropic.available = true;
        results.anthropic.latency = response.latency;
      } catch (error) {
        results.anthropic.error = (error as Error).message;
      }
    }

    return results;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let aiProviderInstance: AIProviderService | null = null;

export function getAIProvider(config?: Partial<AIProviderConfig>): AIProviderService {
  if (!aiProviderInstance) {
    aiProviderInstance = new AIProviderService(config);
  }
  return aiProviderInstance;
}

export function resetAIProvider(): void {
  aiProviderInstance = null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function createSystemMessage(content: string): AIMessage {
  return { role: 'system', content };
}

export function createUserMessage(content: string): AIMessage {
  return { role: 'user', content };
}

export function createAssistantMessage(content: string): AIMessage {
  return { role: 'assistant', content };
}

export default AIProviderService;
