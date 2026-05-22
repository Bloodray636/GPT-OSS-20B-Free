import { AIProvider } from './baseProvider.js';
import { openai } from '../config.js';
import { normalizeNvidiaChunk } from './streamParser.js';

export class NvidiaProvider extends AIProvider {
  constructor() {
    super();
    this.client = openai;
  }

  async *streamCompletion(messages, options = {}, signal = null) {
    const {
      model = 'openai/gpt-oss-120b',
      reasoning_effort = 'medium',
      max_tokens = 4096,
      temperature = 1,
      top_p = 1,
    } = options;

    const completion = await this.client.chat.completions.create(
      {
        model,
        messages,
        temperature,
        top_p,
        max_tokens,
        stream: true,
        extra_body: {
          chat_template_kwargs: {
            thinking: true,
            reasoning_effort,
          },
        },
      },
      signal ? { signal } : {}
    );

    for await (const chunk of completion) {
      console.log('RAW chunk delta:', JSON.stringify(chunk.choices[0]?.delta));
      const { reasoning, content } = normalizeNvidiaChunk(chunk);
      yield { reasoning, content };
    }
  }
}