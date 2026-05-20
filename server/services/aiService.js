import { openai } from '../config.js';

export async function* streamAIResponse(messages, reasoningEffort = 'medium') {
  const completion = await openai.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages,
    temperature: 1,
    top_p: 1,
    max_tokens: 4096,
    stream: true,
    extra_body: {
      chat_template_kwargs: {
        thinking: true,
        reasoning_effort: reasoningEffort,
      },
    },
  });

  for await (const chunk of completion) {
    const reasoning = chunk.choices[0]?.delta?.reasoning || chunk.choices[0]?.delta?.reasoning_content;
    const content = chunk.choices[0]?.delta?.content || '';
    yield { reasoning, content };
  }
}