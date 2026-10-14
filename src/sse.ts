/**
 * Incremental parser for Server-Sent Events. Network chunks can split a line
 * anywhere, so it keeps the unfinished tail until the next chunk arrives.
 */
export class SSEParser {
  private buffer = '';
  private event = 'message';
  private data: string[] = [];

  /** Feed raw text; returns every event completed by this chunk. */
  feed(chunk: string): { event: string; data: string }[] {
    this.buffer += chunk;
    const out: { event: string; data: string }[] = [];
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line === '') {
        if (this.data.length) out.push({ event: this.event, data: this.data.join('\n') });
        this.event = 'message';
        this.data = [];
      } else if (line.startsWith(':')) {
        // comment / keep-alive
      } else {
        const idx = line.indexOf(':');
        const field = idx === -1 ? line : line.slice(0, idx);
        const value = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '');
        if (field === 'event') this.event = value;
        else if (field === 'data') this.data.push(value);
      }
    }
    return out;
  }
}

export function sseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
