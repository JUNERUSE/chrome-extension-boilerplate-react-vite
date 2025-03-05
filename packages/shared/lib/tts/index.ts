import type { EdgeSpeechTTS } from '@lobehub/tts';

export * from '@lobehub/tts';

export type VoiceLocale = keyof typeof EdgeSpeechTTS.voiceList;
