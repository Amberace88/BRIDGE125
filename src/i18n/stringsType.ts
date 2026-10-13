/** Feature string module: English required, other languages optional (DOM-free so the worker can import it). */
export type Strings<T> = { en: T } & { [lang: string]: T | undefined };
