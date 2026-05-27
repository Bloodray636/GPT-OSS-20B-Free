export class AIProvider {
  async *streamCompletion(messages, options = {}, signal = null) {
    throw new Error('Not implemented: streamCompletion must be implemented by subclass');
  }

  async createCompletion(messages, options = {}) {
    throw new Error('Not implemented');
  }
}