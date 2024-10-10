// src/openai-client.ts

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry, { exponentialDelay, isRetryableError } from 'axios-retry';
import FormData from 'form-data';
import fs from 'fs';
import { Readable } from 'stream';
import winston, { format, transports } from 'winston';
import {
  OpenAIError,
  AuthenticationError,
  ValidationError,
  RateLimitError,
  APIError,
} from './errors';
import {
  OpenAIClientOptions,
  LoggingOptions,
  LogLevel,
  ListModelsResponse,
  RetrieveModelResponse,
  CreateCompletionOptions,
  CompletionResponse,
  CompletionStreamResponse,
  CreateChatCompletionOptions,
  ChatCompletionResponse,
  ChatCompletionStreamResponse,
  CreateEmbeddingOptions,
  EmbeddingResponse,
  CreateModerationOptions,
  ModerationResponse,
  CreateEditOptions,
  EditResponse,
  CreateImageOptions,
  CreateImageEditOptions,
  CreateImageVariationOptions,
  ImageResponse,
  AudioOptions,
  UploadFileOptions,
  ListFilesResponse,
  FileObject,
  FileContent,
  CreateFineTuneOptions,
  FineTuneResponse,
  ListFineTuneEventsResponse,
  ContextEntry,
  ErrorResponse,
} from './types';

export default class OpenAIClient {
  private apiKey: string;
  private baseURL: string;
  private client: AxiosInstance;
  private logger: winston.Logger;
  private logLevel: LogLevel;
  private context: ContextEntry[] = [];

  constructor(apiKey: string, options: OpenAIClientOptions = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.openai.com/v1';

    // Initialize logging
    const loggingOptions: LoggingOptions = options.loggingOptions || {};

    this.logLevel = loggingOptions.logLevel || 'info';

    const loggerTransports: winston.transport[] = [
      new transports.Console({
        level: this.logLevel,
        format: format.combine(format.colorize(), format.simple()),
      }),
    ];

    if (loggingOptions.logToFile && loggingOptions.logFilePath) {
      loggerTransports.push(
        new transports.File({
          filename: loggingOptions.logFilePath,
          level: this.logLevel,
          format: format.combine(format.timestamp(), format.json()),
        })
      );
    }

    this.logger = winston.createLogger({
      level: this.logLevel,
      transports: loggerTransports,
    });

    // Merge Axios configurations
    const axiosConfig: AxiosRequestConfig = {
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: options.timeout || 0,
      proxy: options.proxy || false,
      ...options.axiosConfig,
    };

    // Enhanced proxy support
    if (options.proxyConfig) {
      axiosConfig.proxy = false;
      axiosConfig.httpsAgent = options.proxyConfig;
    }

    this.client = axios.create(axiosConfig);

    // Configure axios-retry
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: exponentialDelay,
      retryCondition: isRetryableError,
      ...options.axiosRetryConfig,
    });
  }

  private log(level: LogLevel, message: string): void {
    this.logger.log(level, message);
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const { status, data } = error.response;
      const message = (data as ErrorResponse)?.error?.message || error.message;

      switch (status) {
        case 400:
          throw new ValidationError(message, status, data);
        case 401:
          throw new AuthenticationError(message, status, data);
        case 429:
          throw new RateLimitError(message, status, data);
        default:
          throw new APIError(message, status, data);
      }
    } else if (error.request) {
      throw new OpenAIError(`Network error: ${error.message}`);
    } else {
      throw new OpenAIError(`Error: ${error.message}`);
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data: any = null,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      this.log('info', `Request: ${method} ${endpoint}`);
      if (data) {
        this.log('debug', `Payload: ${JSON.stringify(data)}`);
      }

      const response = await this.client.request<T>({
        method,
        url: endpoint,
        data,
        ...config,
      });

      this.log('debug', `Response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // === Context Management ===

  /**
   * Adds a single entry to the conversation context.
   * @param {ContextEntry} contextEntry - An object with role and content properties.
   * @throws {Error} If the contextEntry is invalid.
   * @example
   * client.addToContext({
   *   role: 'user',
   *   content: 'Tell me a joke.',
   * });
   */
  addToContext(contextEntry: ContextEntry): void {
    if (
      typeof contextEntry === 'object' &&
      ['system', 'user', 'assistant'].includes(contextEntry.role) &&
      typeof contextEntry.content === 'string'
    ) {
      this.context.push(contextEntry);
    } else {
      throw new Error(
        'Context entry must be an object with role ("system", "user", or "assistant") and content properties'
      );
    }
  }

  /**
   * Adds multiple entries to the conversation context.
   * @param {ContextEntry[]} contextEntries - An array of context entries.
   * @throws {Error} If any context entry is invalid.
   * @example
   * client.addBatchToContext([
   *   { role: 'user', content: 'Hello' },
   *   { role: 'assistant', content: 'Hi there!' },
   * ]);
   */
  addBatchToContext(contextEntries: ContextEntry[]): void {
    if (Array.isArray(contextEntries)) {
      for (const contextEntry of contextEntries) {
        this.addToContext(contextEntry);
      }
    } else {
      throw new Error('Input must be an array of context entries');
    }
  }

  /**
   * Retrieves the current conversation context.
   * @returns {ContextEntry[]} The current context.
   * @example
   * const context = client.getContext();
   */
  getContext(): ContextEntry[] {
    return this.context;
  }

  /**
   * Clears the current conversation context.
   * @example
   * client.clearContext();
   */
  clearContext(): void {
    this.context = [];
  }

  // === Models ===

  /**
   * Retrieves a list of available models.
   * @returns {Promise<ListModelsResponse>}
   * @example
   * const models = await client.listModels();
   */
  async listModels(): Promise<ListModelsResponse> {
    return this.request<ListModelsResponse>('GET', '/models');
  }

  /**
   * Retrieves a specific model instance.
   * @param {string} modelId - The ID of the model to retrieve.
   * @returns {Promise<RetrieveModelResponse>}
   * @example
   * const model = await client.retrieveModel('model-id');
   */
  async retrieveModel(modelId: string): Promise<RetrieveModelResponse> {
    return this.request<RetrieveModelResponse>('GET', `/models/${modelId}`);
  }

  // === Completions ===

  /**
   * Creates a completion based on the provided prompt and parameters.
   * @param {CreateCompletionOptions} options - Options for creating a completion.
   * @returns {Promise<CompletionResponse | AsyncIterable<CompletionStreamResponse>>}
   * @example
   * const completion = await client.createCompletion({
   *   model: 'text-davinci-003',
   *   prompt: 'Once upon a time',
   * });
   */
  async createCompletion(
    options: CreateCompletionOptions
  ): Promise<CompletionResponse | AsyncIterable<CompletionStreamResponse>> {
    if (options.stream) {
      const payload = { ...options };
      const response = await this.client.post('/completions', payload, {
        responseType: 'stream',
      });

      const stream = response.data as Readable;
      return this.streamAsyncIterable<CompletionStreamResponse>(stream);
    } else {
      return this.request<CompletionResponse>('POST', '/completions', options);
    }
  }

  // === Chat Completions ===

  /**
   * Creates a completion for the chat message with context.
   * @param {CreateChatCompletionOptions} options - Options for creating a chat completion.
   * @returns {Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionStreamResponse>>}
   * @example
   * const response = await client.createChatCompletion({
   *   model: 'gpt-3.5-turbo',
   *   messages: [{ role: 'user', content: 'Hello' }],
   * });
   */
  async createChatCompletion(
    options: CreateChatCompletionOptions
  ): Promise<ChatCompletionResponse | AsyncIterable<ChatCompletionStreamResponse>> {
    // Include context in the messages
    const messages = [...this.context, ...options.messages];
    const payload = { ...options, messages };

    if (options.stream) {
      const response = await this.client.post('/chat/completions', payload, {
        responseType: 'stream',
      });

      const stream = response.data as Readable;
      return this.streamAsyncIterable<ChatCompletionStreamResponse>(stream);
    } else {
      return this.request<ChatCompletionResponse>('POST', '/chat/completions', payload);
    }
  }

  private async *streamAsyncIterable<T>(stream: Readable): AsyncIterable<T> {
    let buffer = '';

    for await (const chunk of stream) {
      const data = chunk.toString();
      buffer += data;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const content = trimmed.replace('data: ', '').trim();
          if (content === '[DONE]') {
            return;
          }
          const parsed = JSON.parse(content) as T;
          yield parsed;
        }
      }
    }
  }

  // === Embeddings ===

  /**
   * Creates an embedding vector representing the input text.
   * @param {CreateEmbeddingOptions} options - Options for creating an embedding.
   * @returns {Promise<EmbeddingResponse>}
   * @example
   * const embedding = await client.createEmbedding({
   *   model: 'text-embedding-ada-002',
   *   input: 'OpenAI is an AI research lab.',
   * });
   */
  async createEmbedding(options: CreateEmbeddingOptions): Promise<EmbeddingResponse> {
    return this.request<EmbeddingResponse>('POST', '/embeddings', options);
  }

  // === Moderation ===

  /**
   * Classifies if text violates OpenAI's Content Policy.
   * @param {CreateModerationOptions} options - Options for creating a moderation.
   * @returns {Promise<ModerationResponse>}
   * @example
   * const moderation = await client.createModeration({ input: 'Some text' });
   */
  async createModeration(options: CreateModerationOptions): Promise<ModerationResponse> {
    return this.request<ModerationResponse>('POST', '/moderations', options);
  }

  // === Edits ===

  /**
   * Creates a new edit for the provided input, instruction, and parameters.
   * @param {CreateEditOptions} options - Options for creating an edit.
   * @returns {Promise<EditResponse>}
   * @example
   * const edit = await client.createEdit({
   *   model: 'text-davinci-edit-001',
   *   input: 'I can has cheezburger',
   *   instruction: 'Fix the grammar.',
   * });
   */
  async createEdit(options: CreateEditOptions): Promise<EditResponse> {
    return this.request<EditResponse>('POST', '/edits', options);
  }

  // === Images ===

  /**
   * Creates an image given a prompt.
   * @param {CreateImageOptions} options - Options for creating an image.
   * @returns {Promise<ImageResponse>}
   * @example
   * const image = await client.createImage({ prompt: 'A cute puppy' });
   */
  async createImage(options: CreateImageOptions): Promise<ImageResponse> {
    return this.request<ImageResponse>('POST', '/images/generations', options);
  }

  /**
   * Creates an edited or extended image given an original image and a prompt.
   * @param {CreateImageEditOptions} options - Options for creating an image edit.
   * @returns {Promise<ImageResponse>}
   * @example
   * const imageEdit = await client.createImageEdit({
   *   image: 'path/to/image.png',
   *   mask: 'path/to/mask.png',
   *   prompt: 'Add a hat to the person.',
   * });
   */
  async createImageEdit(options: CreateImageEditOptions): Promise<ImageResponse> {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(options.image));

    if (options.mask) {
      formData.append('mask', fs.createReadStream(options.mask));
    }

    formData.append('prompt', options.prompt);

    if (options.n !== undefined) formData.append('n', options.n.toString());
    if (options.size) formData.append('size', options.size);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.user) formData.append('user', options.user);

    return this.request<ImageResponse>('POST', '/images/edits', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  /**
   * Creates a variation of a given image.
   * @param {CreateImageVariationOptions} options - Options for creating an image variation.
   * @returns {Promise<ImageResponse>}
   * @example
   * const imageVariation = await client.createImageVariation({
   *   image: 'path/to/image.png',
   * });
   */
  async createImageVariation(options: CreateImageVariationOptions): Promise<ImageResponse> {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(options.image));

    if (options.n !== undefined) formData.append('n', options.n.toString());
    if (options.size) formData.append('size', options.size);
    if (options.response_format) formData.append('response_format', options.response_format);
    if (options.user) formData.append('user', options.user);

    return this.request<ImageResponse>('POST', '/images/variations', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  // === Audio ===

  /**
   * Transcribes audio into the input language.
   * @param {string} filePath - Path to the audio file.
   * @param {AudioOptions} options - Options for transcribing audio.
   * @returns {Promise<any>}
   * @example
   * const transcription = await client.transcribeAudio('path/to/audio.mp3');
   */
  async transcribeAudio(filePath: string, options: AudioOptions = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', options.model || 'whisper-1');

    for (const key in options) {
      if (key !== 'model') {
        formData.append(key, options[key as keyof AudioOptions] as any);
      }
    }

    return this.request<any>('POST', '/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  /**
   * Translates audio into English.
   * @param {string} filePath - Path to the audio file.
   * @param {AudioOptions} options - Options for translating audio.
   * @returns {Promise<any>}
   * @example
   * const translation = await client.translateAudio('path/to/audio.mp3');
   */
  async translateAudio(filePath: string, options: AudioOptions = {}): Promise<any> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', options.model || 'whisper-1');

    for (const key in options) {
      if (key !== 'model') {
        formData.append(key, options[key as keyof AudioOptions] as any);
      }
    }

    return this.request<any>('POST', '/audio/translations', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  // === Files ===

  /**
   * Returns a list of files that belong to the user's organization.
   * @returns {Promise<ListFilesResponse>}
   * @example
   * const files = await client.listFiles();
   */
  async listFiles(): Promise<ListFilesResponse> {
    return this.request<ListFilesResponse>('GET', '/files');
  }

  /**
   * Uploads a file that contains document(s) to be used across various endpoints/features.
   * @param {UploadFileOptions} options - Options for uploading a file.
   * @returns {Promise<FileObject>}
   * @example
   * const file = await client.uploadFile({
   *   filePath: 'path/to/file.jsonl',
   *   purpose: 'fine-tune',
   * });
   */
  async uploadFile(options: UploadFileOptions): Promise<FileObject> {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(options.filePath));
    formData.append('purpose', options.purpose);

    return this.request<FileObject>('POST', '/files', formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  /**
   * Deletes a file.
   * @param {string} fileId - The ID of the file to delete.
   * @returns {Promise<{ id: string; object: string; deleted: boolean }>}
   * @example
   * const result = await client.deleteFile('file-id');
   */
  async deleteFile(fileId: string): Promise<{ id: string; object: string; deleted: boolean }> {
    return this.request('DELETE', `/files/${fileId}`);
  }

  /**
   * Retrieves a file.
   * @param {string} fileId - The ID of the file to retrieve.
   * @returns {Promise<FileObject>}
   * @example
   * const file = await client.retrieveFile('file-id');
   */
  async retrieveFile(fileId: string): Promise<FileObject> {
    return this.request<FileObject>('GET', `/files/${fileId}`);
  }

  /**
   * Retrieves the content of the specified file.
   * @param {string} fileId - The ID of the file to retrieve.
   * @returns {Promise<Buffer>} - The content of the file as a Buffer.
   * @example
   * const content = await client.retrieveFileContent('file-id');
   */
  async retrieveFileContent(fileId: string): Promise<FileContent> {
    try {
      const response = await this.client.get(`/files/${fileId}/content`, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // === Fine-Tunes ===

  /**
   * Creates a job that fine-tunes a specified model from a given dataset.
   * @param {CreateFineTuneOptions} options - Options for creating a fine-tune.
   * @returns {Promise<FineTuneResponse>}
   * @example
   * const fineTune = await client.createFineTune({ training_file: 'file-id' });
   */
  async createFineTune(options: CreateFineTuneOptions): Promise<FineTuneResponse> {
    return this.request<FineTuneResponse>('POST', '/fine-tunes', options);
  }

  /**
   * List your organization's fine-tuning jobs.
   * @returns {Promise<{ object: string; data: FineTuneResponse[] }>}
   * @example
   * const fineTunes = await client.listFineTunes();
   */
  async listFineTunes(): Promise<{ object: string; data: FineTuneResponse[] }> {
    return this.request<{ object: string; data: FineTuneResponse[] }>('GET', '/fine-tunes');
  }

  /**
   * Retrieves a fine-tune job.
   * @param {string} fineTuneId - The ID of the fine-tune job.
   * @returns {Promise<FineTuneResponse>}
   * @example
   * const fineTune = await client.retrieveFineTune('fine-tune-id');
   */
  async retrieveFineTune(fineTuneId: string): Promise<FineTuneResponse> {
    return this.request<FineTuneResponse>('GET', `/fine-tunes/${fineTuneId}`);
  }

  /**
   * Immediately cancel a fine-tune job.
   * @param {string} fineTuneId - The ID of the fine-tune job to cancel.
   * @returns {Promise<FineTuneResponse>}
   * @example
   * const cancelledFineTune = await client.cancelFineTune('fine-tune-id');
   */
  async cancelFineTune(fineTuneId: string): Promise<FineTuneResponse> {
    return this.request<FineTuneResponse>('POST', `/fine-tunes/${fineTuneId}/cancel`);
  }

  /**
   * Gets fine-grained status updates for a fine-tune job.
   * @param {string} fineTuneId - The ID of the fine-tune job.
   * @returns {Promise<ListFineTuneEventsResponse>}
   * @example
   * const events = await client.listFineTuneEvents('fine-tune-id');
   */
  async listFineTuneEvents(fineTuneId: string): Promise<ListFineTuneEventsResponse> {
    return this.request<ListFineTuneEventsResponse>('GET', `/fine-tunes/${fineTuneId}/events`);
  }

  /**
   * Deletes a fine-tuned model. You must have the Owner role in your organization.
   * @param {string} modelId - The ID of the model to delete.
   * @returns {Promise<{ id: string; object: string; deleted: boolean }>}
   * @example
   * const result = await client.deleteFineTunedModel('model-id');
   */
  async deleteFineTunedModel(
    modelId: string
  ): Promise<{ id: string; object: string; deleted: boolean }> {
    return this.request('DELETE', `/models/${modelId}`);
  }
}
