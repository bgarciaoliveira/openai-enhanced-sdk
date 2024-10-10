// src/types.ts

import { AxiosRequestConfig } from 'axios';
import { Format } from 'logform';

//
// Logging Configuration
//

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LoggingOptions {
  /**
   * Logging level ('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').
   */
  logLevel?: LogLevel;

  /**
   * Enable logging to a file.
   */
  logToFile?: boolean;

  /**
   * Path to the log file.
   */
  logFilePath?: string;

  /**
   * Custom logging format for Winston logger.
   */
  logFormat?: Format;
}

//
// OpenAI Client Options
//

export interface OpenAIClientOptions {
  /**
   * Base URL for the API.
   */
  baseURL?: string;

  /**
   * Request timeout in milliseconds.
   */
  timeout?: number;

  /**
   * Proxy configuration (deprecated in favor of proxyConfig).
   */
  proxy?: AxiosRequestConfig['proxy'];

  /**
   * Enhanced proxy configuration using an HTTPS agent.
   */
  proxyConfig?: any;

  /**
   * Logging configuration options.
   */
  loggingOptions?: LoggingOptions;

  /**
   * Custom axios-retry configuration (plain object type).
   */
  axiosRetryConfig?: Record<string, any>;

  /**
   * Custom Axios configuration options.
   */
  axiosConfig?: AxiosRequestConfig;
}

//
// Context Management
//

export interface ContextEntry {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

//
// Models
//

export interface Model {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: string | null;
}

export interface ListModelsResponse {
  data: Model[];
  object: string;
}

export type RetrieveModelResponse = Model;

//
// Completions
//

export interface CompletionChoice {
  text: string;
  index: number;
  logprobs: any | null;
  finish_reason: string;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: CompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Parameters for createCompletion
export interface CreateCompletionOptions {
  model: string;
  prompt?: string | string[];
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  logprobs?: number | null;
  echo?: boolean;
  stop?: string | string[] | null;
  presence_penalty?: number;
  frequency_penalty?: number;
  best_of?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

// Streaming Completion Response
export interface CompletionStreamResponse {
  id: string;
  object: 'text_completion';
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    logprobs: any | null;
    finish_reason: string | null;
  }>;
}

//
// Chat Completions
//

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionChoice {
  index: number;
  message?: ChatMessage;
  delta?: Partial<ChatMessage>;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Parameters for createChatCompletion
export interface CreateChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
}

// Streaming Chat Completion Response
export interface ChatCompletionStreamResponse {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    delta: Partial<ChatMessage>;
    index: number;
    finish_reason: string | null;
  }>;
}

//
// Embeddings
//

export interface EmbeddingData {
  object: string;
  embedding: number[];
  index: number;
}

export interface EmbeddingResponse {
  object: string;
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Parameters for createEmbedding
export interface CreateEmbeddingOptions {
  model: string;
  input: string | string[];
  user?: string;
}

//
// Moderations
//

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  category_scores: Record<string, number>;
}

export interface ModerationResponse {
  id: string;
  model: string;
  results: ModerationResult[];
}

// Parameters for createModeration
export interface CreateModerationOptions {
  input: string | string[];
  model?: string;
}

//
// Edits
//

export interface EditChoice {
  text: string;
  index: number;
}

export interface EditResponse {
  object: string;
  created: number;
  choices: EditChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Parameters for createEdit
export interface CreateEditOptions {
  model: string;
  input: string;
  instruction: string;
  n?: number;
  temperature?: number;
  top_p?: number;
}

//
// Images
//

export interface ImageData {
  url?: string;
  b64_json?: string;
}

export interface ImageResponse {
  created: number;
  data: ImageData[];
}

// Parameters for image methods
export interface CreateImageOptions {
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface CreateImageEditOptions {
  image: string; // File path
  mask?: string; // File path
  prompt: string;
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

export interface CreateImageVariationOptions {
  image: string; // File path
  n?: number;
  size?: '256x256' | '512x512' | '1024x1024';
  response_format?: 'url' | 'b64_json';
  user?: string;
}

//
// Audio
//

// Parameters for transcribeAudio and translateAudio
export interface AudioOptions {
  model?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  language?: string;
}

//
// Files
//

export interface FileObject {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
}

export interface ListFilesResponse {
  data: FileObject[];
  object: string;
}

// File Content
export type FileContent = Buffer;

// Parameters for uploadFile
export interface UploadFileOptions {
  filePath: string;
  purpose: string;
}

//
// Fine-Tunes
//

export interface FineTuneResponse {
  id: string;
  object: string;
  model: string;
  created_at: number;
  events: any[];
  fine_tuned_model: string | null;
  hyperparams: any;
  organization_id: string;
  result_files: any[];
  status: string;
  validation_files: any[];
  training_files: any[];
  updated_at: number;
}

export interface FineTuneEvent {
  object: string;
  created_at: number;
  level: string;
  message: string;
}

// Response for listing Fine-Tune events
export interface ListFineTuneEventsResponse {
  object: string;
  data: FineTuneEvent[];
}

// Parameters for createFineTune
export interface CreateFineTuneOptions {
  training_file: string;
  validation_file?: string;
  model?: string;
  n_epochs?: number;
  batch_size?: number;
  learning_rate_multiplier?: number;
  prompt_loss_weight?: number;
  compute_classification_metrics?: boolean;
  classification_n_classes?: number;
  classification_positive_class?: string;
  classification_betas?: number[];
  suffix?: string;
}

export interface ErrorResponse {
  error?: {
    message?: string;
  };
}
