// On-device neural voices (Piper) for languages that devices usually have no system voice for.
// Models are MIT/CC-licensed Piper voices from rhasspy/piper-voices on Hugging Face (downloaded once, cached).

import type { Lang } from '../i18n';

export interface NeuralVoice { id: string; model: string; config: string; /** approximate download size */ bytes: number }

const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/';
const voice = (path: string, id: string, bytes: number): NeuralVoice =>
  ({ id, model: `${HF}${path}/${id}.onnx`, config: `${HF}${path}/${id}.onnx.json`, bytes });

/** Languages with an on-device neural voice. The slim phonemizer in /tts/v1/ carries the matching espeak dictionaries. */
export const NEURAL_VOICES: Partial<Record<Lang, NeuralVoice>> = {
  lv: voice('lv/lv_LV/aivars/medium', 'lv_LV-aivars-medium', 63_200_000),
};

export const neuralVoiceFor = (l: Lang): NeuralVoice | null => NEURAL_VOICES[l] ?? null;
