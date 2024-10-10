// example.ts

import dotenv from 'dotenv';
import OpenAIClient from '../src/openai-client';
import { OpenAIError } from '../src/errors';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ContextEntry, CreateChatCompletionOptions, CreateImageOptions } from '../src/types';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';
const client = new OpenAIClient(apiKey, {
  loggingOptions: {
    logLevel: 'info',
    logToFile: false,
  },
});

(async () => {
  try {
    // === Proxy Configuration Example ===

    const proxyAgent = new HttpsProxyAgent('http://localhost:8080');

    const proxyClient = new OpenAIClient(apiKey, {
      proxyConfig: proxyAgent,
      loggingOptions: {
        logLevel: 'info',
      },
    });

    const models = await proxyClient.listModels();
    console.log('\nModels using Proxy:');
    console.log(models);

    // === Context Management ===

    // Clear any existing context
    client.clearContext();

    // Add initial context entries
    client.addToContext({
      role: 'system',
      content: 'You are a helpful assistant.',
    });

    client.addToContext({
      role: 'user',
      content: 'Tell me about the solar system.',
    });

    // Add a batch of context entries
    const contextBatch: ContextEntry[] = [
      {
        role: 'assistant',
        content: 'The solar system consists of the Sun and the objects that orbit it.',
      },
      {
        role: 'user',
        content: 'Can you tell me about Mars?',
      },
    ];
    client.addBatchToContext(contextBatch);

    // Create a chat completion with context
    const chatOptions: CreateChatCompletionOptions = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'What is the atmosphere like on Mars?' }],
    };

    const chatResponse = await client.createChatCompletion(chatOptions);
    console.log('\nChat Completion Response with Context:');
    console.log(chatResponse);

    // Get the current context
    const currentContext = client.getContext();
    console.log('\nCurrent Context:');
    console.log(currentContext);

    // Clear the context
    client.clearContext();

    // === Create Completion ===

    const completionOptions = {
      model: 'text-davinci-003',
      prompt: 'Once upon a time',
      max_tokens: 5,
    };

    const completion = await client.createCompletion(completionOptions);
    console.log('\nCompletion Response:');
    console.log(completion);

    // === Create Embedding ===

    const embeddingOptions = {
      model: 'text-embedding-ada-002',
      input: 'OpenAI is an AI research lab.',
    };

    const embedding = await client.createEmbedding(embeddingOptions);
    console.log('\nEmbedding Response:');
    console.log(embedding);

    // === Create Image ===

    const imageOptions: CreateImageOptions = {
      prompt: 'A sunset over the mountains',
      n: 1,
      size: '512x512',
    };

    const image = await client.createImage(imageOptions);
    console.log('\nImage Response:');
    console.log(image);

    // === Error Handling Example ===

    try {
      const invalidCompletion = await client.createCompletion({
        model: 'invalid-model',
        prompt: 'Hello, world!',
      });
    } catch (error) {
      if (error instanceof OpenAIError) {
        console.error('\nHandled OpenAI Error:', error.message);
      } else {
        console.error('\nUnhandled Error:', error);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();