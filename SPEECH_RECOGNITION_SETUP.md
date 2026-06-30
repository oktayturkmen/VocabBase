# Speech Recognition Setup

Telaffuz Kartlari UI'i hazir. Mikrofonla dogrulama icin Expo Go yerine development build gerektiren bir yerel ses tanima modulu baglanmalidir.

## Onerilen Kurulum Semasi

1. Modulu ekle:

```bash
npx expo install expo-speech-recognition
```

Alternatif olarak React Native tarafinda desteklenen baska bir speech-to-text paketi de kullanilabilir.

2. Native izinleri kontrol et:

- `app.json` icinde Android `RECORD_AUDIO` izni eklidir.
- `app.json` icinde iOS `NSMicrophoneUsageDescription` ve `NSSpeechRecognitionUsageDescription` aciklamalari eklidir.

3. Development build al:

```bash
npx expo prebuild
npx expo run:android
```

iOS icin:

```bash
npx expo run:ios
```

4. Adapter baglantisi:

`src/services/speech-recognition/speech-recognition.service.ts` icindeki `isAvailable` ve `listenOnce` metodlari kurulan paketin `start` / `stop` / result callback API'lerine baglanmalidir.

Beklenen sonuc formati:

```ts
type SpeechRecognitionResult = {
  transcript: string;
  confidence?: number;
};
```

5. Eslesme mantigi:

Servisteki `isMatch(transcript, expectedWord)` kelimeyi normalize ederek birebir eslesme yapar. Daha toleransli telaffuz kontrolu istenirse confidence skoru veya alternatif transcript listesi bu noktada degerlendirilebilir.
