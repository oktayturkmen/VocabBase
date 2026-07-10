import { ExpoSpeechRecognitionModule } from '@jamsch/expo-speech-recognition';

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
    title: 'Mikrofon İzni',
    detail: 'Uygulamanın mikrofonunu kullanması için izin verin. Ayarlar > Gizlilik > Mikrofon kısmından kontrol edebilirsiniz.',
  },
  {
    title: 'İnternet Bağlantısı',
    detail: 'Ses tanıma sistemi internet bağlantısı gerektirir. Bağlantınızın stabil olduğundan emin olun.',
  },
  {
    title: 'Cihaz Desteği',
    detail: 'Cihazınızın ses tanıma özelliğini desteklediğinden emin olun. Bazı eski cihazlarda bu özellik çalışmayabilir.',
  },
];

export class SpeechRecognitionUnavailableError extends Error {
  constructor() {
    super('Ses tanima modulu henuz bagli degil. Yerel modul kurulum semasini takip edin.');
    this.name = 'SpeechRecognitionUnavailableError';
  }
}

export class SpeechRecognitionService {
  async getPermissionStatus(): Promise<{ granted: boolean; canRequest: boolean }> {
    try {
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      return {
        granted: status.granted,
        canRequest: !status.granted && !status.canAskAgain === false,
      };
    } catch {
      return { granted: false, canRequest: false };
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  }

  getSetupSteps(): SpeechRecognitionSetupStep[] {
    return SETUP_STEPS;
  }

  async listenOnce(): Promise<SpeechRecognitionResult> {
    try {
      const status = await this.getPermissionStatus();
      
      // If permission is not granted, try to request it
      if (!status.granted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          // User denied permission - throw error to show setup modal
          throw new SpeechRecognitionUnavailableError();
        }
      }

      return new Promise((resolve, reject) => {
        let resolved = false;
        let resultReceived = false;
        let resultSubscription: any = null;
        let errorSubscription: any = null;
        let endSubscription: any = null;

        const cleanup = () => {
          if (resultSubscription) resultSubscription.remove();
          if (errorSubscription) errorSubscription.remove();
          if (endSubscription) endSubscription.remove();
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch (stopError) {
            console.error('Speech recognition stop error:', stopError);
          }
        };

        // Type-safe event listener for result
        // @ts-ignore - Type definitions are incorrect, API returns subscription
        resultSubscription = ExpoSpeechRecognitionModule.addListener('result', (event: unknown) => {
          if (resolved) return;
          
          const resultEvent = event as { results?: Array<{ transcript: string }> };
          if (resultEvent.results && resultEvent.results.length > 0) {
            const transcript = resultEvent.results[0].transcript;
            resultReceived = true;
            resolved = true;
            resolve({ transcript });
            cleanup();
          }
        });

        // Type-safe event listener for error
        // @ts-ignore - Type definitions are incorrect, API returns subscription
        errorSubscription = ExpoSpeechRecognitionModule.addListener('error', (error: unknown) => {
          if (resolved) return;
          resolved = true;
          console.error('Speech recognition error:', error);
          reject(error);
          cleanup();
        });

        // Type-safe event listener for end - don't reject if result was received
        // @ts-ignore - Type definitions are incorrect, API returns subscription
        endSubscription = ExpoSpeechRecognitionModule.addListener('end', () => {
          if (resolved) return;
          resolved = true;
          
          // Only reject if no result was received
          if (!resultReceived) {
            reject(new Error('Speech recognition ended without result'));
          }
          cleanup();
        });

        try {
          ExpoSpeechRecognitionModule.start({
            lang: 'en-US',
            interimResults: false,
            maxAlternatives: 1,
          });
        } catch (startError) {
          console.error('Speech recognition start error:', startError);
          cleanup();
          reject(startError);
        }
      });
    } catch (error) {
      console.error('Speech recognition service error:', error);
      throw new SpeechRecognitionUnavailableError();
    }
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
