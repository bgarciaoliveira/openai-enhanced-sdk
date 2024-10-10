// tests/openai-client.test.ts

import OpenAIClient from '../src/openai-client';
import { config } from 'dotenv';
import nock from 'nock';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ContextEntry, CreateChatCompletionOptions } from 'types';

config();

describe('OpenAIClient', () => {
  const apiKey = process.env.OPENAI_API_KEY || 'test-api-key';
  const client = new OpenAIClient(apiKey, {
    loggingOptions: { logLevel: 'error' },
  });

  beforeAll(() => {
nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
    nock.cleanAll();
  });

  // === Proxy Configuration Tests ===

  test('should use proxy configuration when provided', async () => {
    const proxyClient = new OpenAIClient(apiKey, {
      proxyConfig: new HttpsProxyAgent('http://localhost:8080'),
    });

    nock('https://api.openai.com')
      .get('/v1/models')
      .reply(200, { data: [], object: 'list' });

    const models = await proxyClient.listModels();
    expect(models).toEqual({ data: [], object: 'list' });
  });

  // === Context Management Tests ===

  test('should add a single entry to context', () => {
    const contextEntry: ContextEntry = {
      role: 'user',
      content: 'Hello, assistant!',
    };
    client.addToContext(contextEntry);
    const context = client.getContext();
    expect(context).toContainEqual(contextEntry);
  });

  test('should add multiple entries to context', () => {
    client.clearContext();
    const contextEntries: ContextEntry[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: 'Tell me a joke.',
      },
    ];
    client.addBatchToContext(contextEntries);
    const context = client.getContext();
    expect(context).toEqual(contextEntries);
  });

  test('should throw error when adding invalid context entry', () => {
    const invalidEntry = {
      role: 'invalid',
      content: 'This should fail.',
    };
    expect(() => client.addToContext(invalidEntry as any)).toThrow(
      'Context entry must be an object with role ("system", "user", or "assistant") and content properties'
    );
  });

  test('should throw error when adding invalid batch context entries', () => {
    const invalidEntries = [
      {
        role: 'user',
        content: 'This is valid.',
      },
      {
        role: 'invalid',
        content: 'This should fail.',
      },
    ];
    expect(() => client.addBatchToContext(invalidEntries as any)).toThrow(
      'Context entry must be an object with role ("system", "user", or "assistant") and content properties'
    );
  });

  test('should clear context', () => {
    client.clearContext();
    const context = client.getContext();
    expect(context).toEqual([]);
  });

  test('should include context in createChatCompletion', async () => {
    client.clearContext();
    const contextEntries: ContextEntry[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: 'What is the weather today?',
      },
    ];
    client.addBatchToContext(contextEntries);

    const options: CreateChatCompletionOptions = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Do I need an umbrella?' }],
    };

    const expectedMessages = [...contextEntries, ...options.messages];

    const mockResponse = {
      id: 'chat-completion-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Yes, you should take an umbrella today.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 10,
        total_tokens: 30,
      },
    };

    // Mock the API call and capture the request payload
    let requestPayload: any;
    nock('https://api.openai.com')
      .post('/v1/chat/completions', (body) => {
        requestPayload = body;
        return true;
      })
      .reply(200, mockResponse);

    const response = await client.createChatCompletion(options);
    expect(response).toEqual(mockResponse);

    expect(requestPayload.messages).toEqual(expectedMessages);
  });

  // === Completion Tests ===

  test('should create a completion', async () => {
    const completionOptions = {
      model: 'text-davinci-003',
      prompt: 'Hello, world!',
    };

    const mockResponse = {
      id: 'completion-id',
      object: 'text_completion',
      created: 1234567890,
      model: 'text-davinci-003',
      choices: [
        {
          text: 'Hello to you too!',
          index: 0,
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 5,
        total_tokens: 10,
      },
    };

    nock('https://api.openai.com')
      .post('/v1/completions', completionOptions)
      .reply(200, mockResponse);

    const response = await client.createCompletion(completionOptions);
    expect(response).toEqual(mockResponse);
  });

  // === Embedding Tests ===

  test('should create an embedding', async () => {
    const embeddingOptions = {
      model: 'text-embedding-ada-002',
      input: 'OpenAI is an AI research lab.',
    };

    const mockResponse = {
      object: 'list',
      data: [
        {
          object: 'embedding',
          embedding: [0.1, 0.2, 0.3],
          index: 0,
        },
      ],
      model: 'text-embedding-ada-002',
      usage: {
        prompt_tokens: 5,
        total_tokens: 5,
      },
    };

    nock('https://api.openai.com')
      .post('/v1/embeddings', embeddingOptions)
      .reply(200, mockResponse);

    const response = await client.createEmbedding(embeddingOptions);
    expect(response).toEqual(mockResponse);
  });

  // === Moderation Tests ===

  test('should create a moderation', async () => {
    const moderationOptions = {
      input: 'Some potentially unsafe content.',
    };

    const mockResponse = {
      id: 'modr-id',
      model: 'text-moderation-001',
      results: [
        {
          flagged: false,
          categories: {
            hate: false,
            'hate/threatening': false,
            harassment: false,
            'self-harm': false,
            sexual: false,
            'sexual/minors': false,
            violence: false,
            'violence/graphic': false,
          },
          category_scores: {
            hate: 0.0,
            'hate/threatening': 0.0,
            harassment: 0.0,
            'self-harm': 0.0,
            sexual: 0.0,
            'sexual/minors': 0.0,
            violence: 0.0,
            'violence/graphic': 0.0,
          },
        },
      ],
    };

    nock('https://api.openai.com')
      .post('/v1/moderations', moderationOptions)
      .reply(200, mockResponse);

    const response = await client.createModeration(moderationOptions);
    expect(response).toEqual(mockResponse);
  });

  // === Error Handling Tests ===

  test('should handle authentication errors', async () => {
    const completionOptions = {
      model: 'text-davinci-003',
      prompt: 'Hello, world!',
    };

    nock('https://api.openai.com')
      .post('/v1/completions', completionOptions)
      .reply(401, { error: { message: 'Unauthorized' } });

    await expect(client.createCompletion(completionOptions)).rejects.toThrow('Unauthorized');
  });

  test('should handle validation errors', async () => {
    const completionOptions = {
      model: 'invalid-model',
      prompt: 'Hello, world!',
    };

    nock('https://api.openai.com')
      .post('/v1/completions', completionOptions)
      .reply(400, { error: { message: 'Invalid model' } });

    await expect(client.createCompletion(completionOptions)).rejects.toThrow('Invalid model');
  });
});