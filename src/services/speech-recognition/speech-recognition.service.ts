export type SpeechRecognitionResult = {
  transcript: string;
  confidence?: number;
};

export type SpeechRecognitionSetupStep = {
  title: string;
  detail: string;
};

const SETUP_STEPS: SpeechRecognitionSetupStep[] = [
  {
    title: 'Install native module',
    detail: 'Add a speech recognition package such as expo-speech-recognition to the project.',
  },
  {
    title: 'Add app permissions',
    detail:
      'Configure NSMicrophoneUsageDescription, NSSpeechRecognitionUsageDescription, and Android RECORD_AUDIO permission in app.json.',
  },
  {
    title: 'Use a development build',
    detail: 'Rebuild the native app because microphone speech recognition is not available in Expo Go.',
  },
  {
    title: 'Connect adapter',
    detail:
      'Replace listenOnce in speech-recognition.service.ts with the installed module start/stop callbacks.',
  },
];

export class SpeechRecognitionUnavailableError extends Error {
  constructor() {
    super('Ses tanima modulu henuz bagli degil. Yerel modul kurulum semasini takip edin.');
    this.name = 'SpeechRecognitionUnavailableError';
  }
}

export class SpeechRecognitionService {
  isAvailable(): boolean {
    return false;
  }

  getSetupSteps(): SpeechRecognitionSetupStep[] {
    return SETUP_STEPS;
  }

  async listenOnce(): Promise<SpeechRecognitionResult> {
    throw new SpeechRecognitionUnavailableError();
  }

  normalize(text: string): string {
    return text
      .trim()
      .toLocaleLowerCase('en-US')
      .replace(/[^a-z'\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  isMatch(transcript: string, expectedWord: string): boolean {
    return this.normalize(transcript) === this.normalize(expectedWord);
  }
}

let speechRecognitionServiceInstance: SpeechRecognitionService | null = null;

export function getSpeechRecognitionService(): SpeechRecognitionService {
  if (!speechRecognitionServiceInstance) {
    speechRecognitionServiceInstance = new SpeechRecognitionService();
  }

  return speechRecognitionServiceInstance;
}
