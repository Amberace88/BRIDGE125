/**
 * "Get it" in the wardrobe → open the Shop on that item, without App.tsx having to thread the id through.
 * The wardrobe calls focusShopItem(id) right before onShop(); ShopScreen takes it on mount.
 */
let pending: string | null = null;
export const focusShopItem = (id: string | null | undefined) => { pending = id ?? null; };
export const takeShopFocus = () => { const p = pending; pending = null; return p; };
