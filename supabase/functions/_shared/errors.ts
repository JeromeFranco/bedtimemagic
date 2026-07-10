export class SafetyFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafetyFilterError";
  }
}

export class TTSError extends Error {
  constructor(
    public sentenceIndex: number,
    public override cause: unknown
  ) {
    super(`TTS failed for sentence ${sentenceIndex}`);
    this.name = "TTSError";
  }
}
