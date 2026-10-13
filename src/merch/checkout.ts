import type { ColourId } from './catalog';

/**
 * Merch checkout contract (store UI ⇄ fulfilment). The store screen builds a cart and calls `startMerchCheckout`;
 * the fulfilment layer (worker/merch*.ts + Stripe + Printful / Gelato / Prodigi / Printify) implements it.
 */
export interface CartItem { productId: string; colour: ColourId | null; size: string | null; qty: number }

export type CheckoutError = 'auth' | 'unavailable' | 'invalid' | 'network' | 'consent' | 'region';
export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };

/** Start a Stripe Checkout for the cart; resolves to the URL to redirect to. Stub until fulfilment lands. */
export async function startMerchCheckout(_items: CartItem[], _opts: { lang: string; consent: boolean; country?: string }): Promise<CheckoutResult> {
  return { ok: false, error: 'unavailable' };
}

/** True when real orders can be placed (payment + at least one print provider configured on the server). */
export async function merchCheckoutAvailable(): Promise<boolean> { return false; }
