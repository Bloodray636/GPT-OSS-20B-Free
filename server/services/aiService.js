import { openai } from '../config.js';

export async function* streamAIResponse(messages, reasoningEffort = 'medium', signal) {
  const completion = await openai.chat.completions.create(
    {
      model: 'deepseek-ai/deepseek-v4-flash',
      messages,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 2048,
      stream: true,
      extra_body: {
        chat_template_kwargs: {
          thinking: true,
          reasoning_effort: reasoningEffort,
        },
      },
    },
    { signal }
  );

  for await (const chunk of completion) {
    const reasoning = chunk.choices[0]?.delta?.reasoning || chunk.choices[0]?.delta?.reasoning_content;
    const content = chunk.choices[0]?.delta?.content || '';
    yield { reasoning, content };
  }
}