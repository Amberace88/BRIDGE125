import { beforeEach, describe, expect, it } from 'vitest';
import { _resetCartMemory, addToCart, cartCount, cartSubtotal, clearCart, freeShippingLeft, getCart, lineKey, removeLine, sanitize, setQty, toCheckoutItems } from './cart';
import { FREE_SHIPPING_EUR, MERCH_MAX_QTY } from './config';

describe('cart', () => {
  beforeEach(() => { _resetCartMemory(); clearCart(); });

  it('sanitises stored lines against the catalogue', () => {
    const out = sanitize([
      { productId: 'tee-queen', colour: 'ink', size: 'L', qty: 2 },
      { productId: 'tee-queen', colour: 'ink', size: 'L', qty: 1 },      // merged
      { productId: 'tee-queen', colour: 'ink', size: 'XXXL', qty: 1 },   // unknown size
      { productId: 'tee-queen', colour: 'pink', size: 'L', qty: 1 },     // unknown colour
      { productId: 'nope', colour: null, size: null, qty: 1 },           // unknown product
      { productId: 'mug-seven', colour: null, size: null, qty: 99 },     // single colour filled in, qty clamped
      { productId: 'tee-lady', colour: 'white', size: null, qty: 1 },    // size required
      'garbage', null,
    ]);
    expect(out.map(l => l.key)).toEqual([lineKey('tee-queen', 'ink', 'L'), lineKey('mug-seven', 'white', null)]);
    expect(out[0].qty).toBe(3);
    expect(out[1].qty).toBe(MERCH_MAX_QTY);
    expect(sanitize('{"x":1}')).toEqual([]);
  });

  it('adds, merges, changes and removes lines', () => {
    addToCart({ productId: 'tee-queen', colour: 'ink', size: 'M' });
    addToCart({ productId: 'tee-queen', colour: 'ink', size: 'M', qty: 2 });
    addToCart({ productId: 'poster-lady', colour: 'oak', size: '50x70' });
    let ls = getCart();
    expect(ls).toHaveLength(2);
    expect(cartCount(ls)).toBe(4);
    expect(cartSubtotal(ls)).toBe(32 * 3 + (29 + 20 + 25));
    setQty(ls[0].key, 1);
    ls = getCart();
    expect(ls[0].qty).toBe(1);
    setQty(ls[0].key, 0);
    expect(getCart()).toHaveLength(1);
    removeLine(getCart()[0].key);
    expect(getCart()).toEqual([]);
  });

  it('computes the free-shipping gap and the checkout payload', () => {
    expect(freeShippingLeft(0)).toBe(FREE_SHIPPING_EUR);
    expect(freeShippingLeft(FREE_SHIPPING_EUR + 1)).toBe(0);
    expect(freeShippingLeft(FREE_SHIPPING_EUR - 0.1)).toBeCloseTo(0.1);
    addToCart({ productId: 'mug-lady', colour: 'white', size: null, qty: 2 });
    expect(toCheckoutItems(getCart())).toEqual([{ productId: 'mug-lady', colour: 'white', size: null, qty: 2 }]);
  });
});
