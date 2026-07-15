import { getGroqApiKey, GROQ_CHAT_ENDPOINT, GROQ_MODEL } from './utils';

/**
 * Roleplay sohbeti için tek bir mesajı temsil eder.
 * - `role`: Mesajı gönderen taraf ('user' = kullanıcı, 'model' = AI)
 * - `text`: Mesajın içeriği
 *
 * Not: "model" rolü, Groq/OpenAI API'sindeki "assistant" rolüne karşılık gelir.
 * Dış bağımlılıklar (store, UI) bu tipi kullandığı için servis içi tip korunur,
 * API isteğine gönderilirken "assistant" rolüne dönüştürülür.
 */
export interface RoleplayMessage {
  role: 'user' | 'model';
  text: string;
}

/**
 * Roleplay servisi hataları için özel hata sınıfı.
 * Hatanın kaynağını (cause) taşır böylece üst katmanlar daha bilgilendirici
 * hata mesajları gösterebilir.
 */
export class RoleplayError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RoleplayError';
  }
}

/**
 * Groq/OpenAI chat completions API'sinde kullanılan mesaj tipleri.
 * - `system`: Sistem talimatı (System Instruction)
 * - `user`: Kullanıcı mesajı
 * - `assistant`: AI (model) mesajı
 */
type GroqRole = 'system' | 'user' | 'assistant';

interface GroqChatMessage {
  role: GroqRole;
  content: string;
}

interface GroqChatChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface GroqChatResponse {
  id: string;
  choices: GroqChatChoice[];
}

interface GroqApiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

/**
 * Verilen senaryo ve hedef kelimeler için sistem talimatı (System Instruction) oluşturur.
 *
 * Bu talimat AI'a şu kuralları öğretir:
 * - Senaryoya bürünmesi
 * - Maksimum 2-3 cümle ile cevap vermesi
 * - Hedef kelimeleri takip etmesi
 * - Kullanıcı hedef kelimeyi doğru kullandığında tebrik etmesi
 *
 * Groq API'de bu talimat, `messages` array'inin ilk elemanı olarak
 * `{ role: "system", content: "..." }` formatında gönderilir.
 *
 * @param scenario - Roleplay senaryosu (örn: "job interview", "cafe", "airport")
 * @param targetWords - Kullanıcının pratik yapması gereken hedef kelimeler
 * @returns Sistem talimatı metni
 */
function buildSystemInstruction(scenario: string | null, targetWords: string[]): string {
  const wordList = targetWords.length > 0 ? targetWords.join(', ') : 'No specific target words';

  const scenarioSection = scenario
    ? `## SCENARIO
You are in a "${scenario}" situation. Stay in character throughout the entire conversation. Act naturally as someone in this scenario would.`
    : `## SCENARIO
Continue the ongoing roleplay based on the conversation history. Stay in character and maintain consistency with previous messages.`;

  return `You are an AI conversation partner for English language practice through roleplay.

${scenarioSection}

## TARGET WORDS
The user is practicing these English words: ${wordList}
Keep these words in mind throughout the entire conversation.

## STRICT RULES
1. Respond ONLY in English.
2. Keep your responses SHORT: maximum 2-3 sentences. Never exceed this limit.
3. Keep the conversation flowing naturally by asking follow-up questions or prompting the user to respond.
4. When the user correctly uses one of the TARGET WORDS in a proper context, you MUST acknowledge it in your next response by briefly congratulating them (e.g., "Great job using 'word' there!"). Do this naturally within your response, not as a separate note.
5. Do not explicitly list, teach, or force the target words. Let them emerge naturally in the conversation.
6. Be encouraging, friendly, and supportive. Adapt to the user's English proficiency level.
7. If the user makes significant grammar mistakes that hinder understanding, gently provide the correct form. Do not over-correct minor issues.
8. Never break character. Never mention that you are an AI or language model.`;
}

/**
 * RoleplayMessage[] formatını Groq/OpenAI API'nin beklediği
 * GroqChatMessage[] formatına dönüştürür.
 *
 * - Servis içi "model" rolü, API'deki "assistant" rolüne çevrilir.
 * - Kullanıcının yeni mesajı listenin sonuna eklenir.
 * - OpenAI formatında history'nin 'user' ile başlama zorunluluğu yoktur,
 *   bu yüzden Gemini'deki gibi dummy mesaj eklenmesine gerek yoktur.
 *
 * @param messages - RoleplayMessage formatındaki mesaj listesi (chat history)
 * @param userMessage - Kullanıcının yeni mesajı
 * @returns Groq/OpenAI API formatında mesaj listesi (system hariç)
 */
function toGroqMessages(
  messages: RoleplayMessage[],
  userMessage: string,
): GroqChatMessage[] {
  const chatMessages: GroqChatMessage[] = messages.map((msg) => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.text,
  }));

  // Kullanıcının yeni mesajını ekle
  chatMessages.push({
    role: 'user',
    content: userMessage,
  });

  return chatMessages;
}

/**
 * Groq API'ye chat completions isteği gönderir.
 *
 * OpenAI uyumlu `v1/chat/completions` endpoint'ine `fetch` ile POST isteği atar.
 * System instruction, `messages` array'inin ilk elemanı olarak eklenir.
 *
 * @param systemInstruction - Sistem talimatı metni
 * @param chatMessages - Sohbet geçmişi + yeni mesaj (GroqChatMessage formatında)
 * @returns AI'ın ürettiği cevap metni
 * @throws {RoleplayError} API hatası, ağ hatası veya geçersiz yanıt durumunda
 */
async function callGroqApi(
  systemInstruction: string,
  chatMessages: GroqChatMessage[],
): Promise<string> {
  const messages: GroqChatMessage[] = [
    { role: 'system', content: systemInstruction },
    ...chatMessages,
  ];

  const apiKey = getGroqApiKey();

  // Explicit null/undefined kontrolü - API anahtarı yoksa istek atmadan erken dönüş
  if (!apiKey) {
    throw new RoleplayError('Groq API anahtarı bulunamadı. Lütfen EXPO_PUBLIC_GROQ_API_KEY ortam değişkenini ayarlayın.');
  }

  const response = await fetch(GROQ_CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  // HTTP hatası durumunda hata body'sini parse et ve bilgilendirici hata fırlat
  if (!response.ok) {
    let errorDetail = `Groq API ${response.status} hatası`;
    try {
      const errorBody = (await response.json()) as GroqApiErrorBody;
      if (errorBody.error?.message) {
        errorDetail = errorBody.error.message;
      }
    } catch {
      // JSON parse edilemezse varsayılan mesajı kullan
    }
    throw new RoleplayError(`Groq API hatası: ${errorDetail}`, {
      status: response.status,
      statusText: response.statusText,
    });
  }

  const data = (await response.json()) as GroqChatResponse;
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new RoleplayError('Groq API geçerli bir cevap döndürmedi');
  }

  return reply;
}

/**
 * Yeni bir roleplay oturumu başlatır.
 *
 * AI, verilen senaryoya bürünür ve kullanıcıya kısa, sohbeti devam ettiren
 * bir İngilizce giriş mesajı gönderir. Sistem talimatı (System Instruction)
 * olarak senaryo ve hedef kelimeler AI'a aktarılır.
 *
 * @param scenario - Roleplay senaryosu (örn: "job interview", "cafe", "airport")
 * @param targetWords - Kullanıcının pratik yapması gereken hedef kelimeler
 * @returns AI'ın giriş (greeting) mesajı
 * @throws {RoleplayError} Senaryo boşsa veya AI geçerli bir mesaj döndürmezse
 */
export async function startRoleplaySession(
  scenario: string,
  targetWords: string[],
): Promise<string> {
  if (!scenario.trim()) {
    throw new RoleplayError('Senaryo boş olamaz');
  }

  // API anahtarını çağrı anında (call time) oku — module load time caching sorunlarını önler
  const apiKey = getGroqApiKey();

  // API anahtarı yoksa güvenli fallback döndür
  if (!apiKey) {
    console.warn('⚠️ [ROLEPLAY] Groq API anahtarı bulunamadı, fallback giriş mesajı kullanılıyor.');
    return getFallbackGreeting(scenario, targetWords);
  }

  try {
    const systemInstruction = buildSystemInstruction(scenario, targetWords);

    // AI'dan senaryoya uygun bir giriş mesajı üretmesini iste
    const starterMessage: GroqChatMessage = {
      role: 'user',
      content: 'Start the roleplay now. Greet me in character with a short, engaging opening message.',
    };

    const greeting = await callGroqApi(systemInstruction, [starterMessage]);

    if (!greeting) {
      throw new RoleplayError('AI boş giriş mesajı döndürdü');
    }

    return greeting;
  } catch (error) {
    // RoleplayError zaten fırlatılmışsa tekrar sarmalama
    if (error instanceof RoleplayError) {
      throw error;
    }

    console.error('❌ [ROLEPLAY] Oturum başlatılamadı:', error);
    return getFallbackGreeting(scenario, targetWords);
  }
}

/**
 * Mevcut bir roleplay sohbetine yeni mesaj gönderir.
 *
 * Geçmiş mesajları ve kullanıcının yeni mesajını Groq API'ye iletir.
 * Sistem talimatı, hedef kelimelerin takip edilmesi ve kuralların
 * uygulanması için her çağrıda yeniden oluşturulur. Senaryo bağlamı
 * ise sohbet geçmişinden (chatHistory) gelir.
 *
 * @param chatHistory - Önceki mesajların listesi (RoleplayMessage[])
 * @param userMessage - Kullanıcının yeni mesajı
 * @param targetWords - Kullanıcının pratik yapması gereken hedef kelimeler
 * @returns AI'ın yeni cevabı
 * @throws {RoleplayError} Mesaj boşsa veya AI geçerli bir cevap döndürmezse
 */
export async function sendRoleplayMessage(
  chatHistory: RoleplayMessage[],
  userMessage: string,
  targetWords: string[],
): Promise<string> {
  if (!userMessage.trim()) {
    throw new RoleplayError('Mesaj boş olamaz');
  }

  // API anahtarını çağrı anında (call time) oku — module load time caching sorunlarını önler
  const apiKey = getGroqApiKey();

  // API anahtarı yoksa güvenli fallback döndür
  if (!apiKey) {
    console.warn('⚠️ [ROLEPLAY] Groq API anahtarı bulunamadı, fallback cevap kullanılıyor.');
    return getFallbackResponse(userMessage, targetWords);
  }

  try {
    // Senaryo bağlamı chatHistory'den gelir; burada sadece kuralları ve
    // hedef kelimeleri sistem talimatı olarak tekrar veriyoruz.
    const systemInstruction = buildSystemInstruction(null, targetWords);

    // Tüm konuşma geçmişini ve yeni mesajı Groq/OpenAI formatına dönüştür.
    const chatMessages = toGroqMessages(chatHistory, userMessage);

    const reply = await callGroqApi(systemInstruction, chatMessages);

    if (!reply) {
      throw new RoleplayError('AI boş cevap döndürdü');
    }

    return reply;
  } catch (error) {
    // RoleplayError zaten fırlatılmışsa tekrar sarmalama
    if (error instanceof RoleplayError) {
      throw error;
    }

    console.error('❌ [ROLEPLAY] Mesaj gönderilemedi:', error);
    return getFallbackResponse(userMessage, targetWords);
  }
}

// ─── Fallback Fonksiyonları ──────────────────────────────────────────────
// API anahtarı yoksa veya API hatası durumunda uygulama çökmesin diye
// basit ama işlevsel fallback cevaplar üretir.

/**
 * API erişimi olmadığında üretilen fallback giriş mesajı.
 */
function getFallbackGreeting(scenario: string, targetWords: string[]): string {
  const wordsHint =
    targetWords.length > 0
      ? ` Try to use words like: ${targetWords.join(', ')}.`
      : '';

  return `Hello! Welcome to our ${scenario} roleplay. I'm here to help you practice your English.${wordsHint} How can I help you today?`;
}

/**
 * API erişimi olmadığında üretilen fallback cevap.
 * Kullanıcı hedef kelimelerden birini kullandıysa basit bir tebrik ekler.
 */
function getFallbackResponse(userMessage: string, targetWords: string[]): string {
  const usedWords = targetWords.filter((word) =>
    userMessage.toLowerCase().includes(word.toLowerCase()),
  );

  if (usedWords.length > 0) {
    return `Great job using "${usedWords[0]}" in your sentence! That's exactly the right context. Can you tell me more?`;
  }

  return `I understand what you mean. Can you tell me more about that?`;
}