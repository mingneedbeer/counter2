import { useState, useEffect } from "react";

type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  qty: number;
  image: string;
};

const INITIAL_ITEMS: CartItem[] = [
  { id: "vinyl-1", name: "Japanese Import Vinyl", description: '7" Single Record', price: 29.99, qty: 1, image: "JP" },
  { id: "cd-1", name: "Japanese Edition CD Album", description: "Obi Strip Included", price: 22.99, qty: 2, image: "CD" },
];

const STORAGE_KEY = "checkout_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return INITIAL_ITEMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return INITIAL_ITEMS;
}

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
      ).filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal >= 50 ? 0 : 9.99;
  const total = subtotal + shipping;

  return (
    <>
      <div class="space-y-4">
        {items.length === 0 ? (
          <div class="text-center py-8 text-base-content/40">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <p class="text-sm">Your cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} class="flex gap-4">
              <div class="size-20 rounded-box bg-base-200 flex items-center justify-center shrink-0 overflow-hidden">
                <div class="bg-primary/10 text-primary font-bold text-lg flex items-center justify-center w-full h-full">
                  {item.image}
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-medium text-sm">{item.name}</p>
                    <p class="text-xs text-base-content/60">{item.description}</p>
                  </div>
                  <button onClick={() => removeItem(item.id)} class="btn btn-ghost btn-xs text-base-content/40 hover:text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div class="flex items-center justify-between mt-2">
                  <div class="join border border-base-300 rounded-box">
                    <button onClick={() => updateQty(item.id, -1)} class="join-item btn btn-ghost btn-xs px-2">−</button>
                    <span class="join-item px-3 text-sm font-medium flex items-center min-w-[2rem] justify-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} class="join-item btn btn-ghost btn-xs px-2">+</button>
                  </div>
                  <p class="font-medium text-sm">${(item.price * item.qty).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <>
          <div class="divider my-4"></div>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between py-1">
              <span class="text-base-content/60">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-base-content/60">Shipping</span>
              {shipping === 0 ? (
                <span class="text-green-600 font-medium">Free</span>
              ) : (
                <span>${shipping.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div class="divider my-4"></div>

          <div class="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          {shipping > 0 && (
            <div class="alert bg-base-200 text-xs p-3 mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Add ${(50 - subtotal).toFixed(2)} more for free shipping
            </div>
          )}
        </>
      )}
    </>
  );
}
