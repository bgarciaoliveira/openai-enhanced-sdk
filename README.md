# OpenAI TypeScript SDK

A comprehensive TypeScript SDK for the OpenAI API, providing easy access to all functionalities offered by OpenAI, including models, completions, **context management**, chat completions, edits, images, embeddings, audio, files, fine-tunes, and moderations.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
  - [Initialization](#initialization)
  - [Authentication](#authentication)
- [Usage Examples](#usage-examples)
  - [Context Management](#context-management)
  - [Proxy Configuration](#proxy-configuration)
  - [List Models](#list-models)
  - [Create Completion](#create-completion)
  - [Create Chat Completion](#create-chat-completion)
  - [Create Embedding](#create-embedding)
  - [Create Image](#create-image)
  - [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Logging](#logging)
- [Testing](#testing)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)
- [TODO](#todo)

## Features

- **Complete API Coverage**: Implements all major OpenAI API endpoints.
- **Context Management**: Manage conversation context easily for chat completions.
- **Streaming Support**: Supports streaming for completions and chat completions.
- **Robust Error Handling**: Provides custom error classes for different error types.
- **TypeScript Support**: Includes comprehensive type definitions.
- **Logging**: Configurable logging using Winston.
- **Retry Mechanism**: Built-in retry logic using `axios-retry`.
- **Proxy Support**: Enhanced proxy configuration for flexible network setups.
- **Extensible**: Easily extendable for future API endpoints.

## Installation

Install the package via npm:

```bash
npm install openai-enhanced-sdk
```

## Getting Started

### Initialization

Import and instantiate the `OpenAIClient`:

```typescript
import OpenAIClient from 'openai-enhanced-sdk';

const apiKey = process.env.OPENAI_API_KEY || '';
const client = new OpenAIClient(apiKey);
```

### Authentication

Ensure you have your OpenAI API key stored securely, preferably in an environment variable:

```bash
export OPENAI_API_KEY=your_api_key_here
```

## Usage Examples

### Context Management

#### Add a single entry to context

```typescript
client.addToContext({
  role: 'system',
  content: 'You are a helpful assistant.',
});
```

#### Add multiple entries to context

```typescript
const contextEntries = [
  {
    role: 'user',
    content: 'Tell me a joke.',
  },
  {
    role: 'assistant',
    content: 'Why did the chicken cross the road? To get to the other side!',
  },
];
client.addBatchToContext(contextEntries);
```

#### Get current context

```typescript
const context = client.getContext();
console.log(context);
```

#### Clear context

```typescript
client.clearContext();
```

#### Use context in chat completion

```typescript
const response = await client.createChatCompletion({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Do I need an umbrella today?' }],
});
console.log(response);
```

### Proxy Configuration

#### Using Proxy with Custom HTTPS Agent

```typescript
import HttpsProxyAgent from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent('http://localhost:8080');

const proxyClient = new OpenAIClient(apiKey, {
  proxyConfig: proxyAgent,
});
```

### List Models

```typescript
const models = await client.listModels();
console.log(models);
```

### Create Completion

```typescript
const completion = await client.createCompletion({
  model: 'text-davinci-003',
  prompt: 'Once upon a time',
  max_tokens: 5,
});
console.log(completion);
```

### Create Chat Completion

```typescript
const chatCompletion = await client.createChatCompletion({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Hello, how are you?' }],
});
console.log(chatCompletion);
```

### Create Embedding

```typescript
const embedding = await client.createEmbedding({
  model: 'text-embedding-ada-002',
  input: 'OpenAI is an AI research lab.',
});
console.log(embedding);
```

### Create Image

```typescript
const image = await client.createImage({
  prompt: 'A sunset over the mountains',
  n: 1,
  size: '512x512',
});
console.log(image);
```

### Error Handling

```typescript
try {
  const completion = await client.createCompletion({
    model: 'text-davinci-003',
    prompt: 'Hello, world!',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication Error:', error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation Error:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate Limit Exceeded:', error.message);
  } else if (error instanceof APIError) {
    console.error('API Error:', error.message);
  } else {
    console.error('Unknown Error:', error);
  }
}
```

## Configuration

You can customize the client using the `OpenAIClientOptions` interface:

```typescript
import HttpsProxyAgent from 'https-proxy-agent';

const proxyAgent = new HttpsProxyAgent('http://localhost:8080');

const client = new OpenAIClient(apiKey, {
  baseURL: 'https://api.openai.com/v1',
  timeout: 10000, // 10 seconds timeout
  proxyConfig: proxyAgent,
  loggingOptions: {
    logLevel: 'debug',
    logToFile: true,
    logFilePath: './logs/openai-sdk.log',
  },
  axiosRetryConfig: {
    retries: 5,
    retryDelay: axiosRetry.exponentialDelay,
  },
});
```

## Logging

The SDK uses Winston for logging. You can configure logging levels and outputs:

```typescript
loggingOptions: {
  logLevel: 'info', // 'error' | 'warn' | 'info' | 'debug'
  logToFile: true,
  logFilePath: './logs/openai-sdk.log',
}
```

## Testing

The SDK includes comprehensive unit tests using Jest. To run the tests:

```bash
npm run test
```

## Documentation

For more detailed information, please refer to the [OpenAI Enhanced SDK Documentation](https://bgarciaoliveira.github.io/openai-enhanced-sdk/index.html).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License

This project is licensed under the MIT License.

---

If you have any questions or need assistance, feel free to reach out!