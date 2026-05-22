export function normalizeNvidiaChunk(chunk) {
  const delta = chunk.choices[0]?.delta;
  
  return {
    reasoning: delta?.reasoning || delta?.reasoning_content || null,
    content: delta?.content || null,
  };
}