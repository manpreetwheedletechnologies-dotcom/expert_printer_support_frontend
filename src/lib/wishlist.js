import { useState, useEffect } from "react";

// =============================================================================
// WISHLIST HELPERS
// =============================================================================

export const getWishlist = () =>
  JSON.parse(localStorage.getItem("wishlist") || "[]");

export const saveWishlist = (items) => {
  localStorage.setItem("wishlist", JSON.stringify(items));
  window.dispatchEvent(new Event("storage"));
};

export const isInWishlist = (id) =>
  getWishlist().some((item) => item.id === id);

export const addToWishlist = (product) => {
  const current = getWishlist();

  if (!current.find((item) => item.id === product.id)) {
    saveWishlist([
      ...current,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        original_price: product.original_price,
        image: product.image,
        url: product.url,
        quantity: 1,
      },
    ]);
  }
};

export const removeFromWishlist = (id) =>
  saveWishlist(getWishlist().filter((item) => item.id !== id));

export const updateWishlistQty = (id, qty) => {
  if (qty <= 0) {
    removeFromWishlist(id);
    return;
  }
  saveWishlist(
    getWishlist().map((item) =>
      item.id === id ? { ...item, quantity: qty } : item
    )
  );
};

export const getWishlistTotalQty = () =>
  getWishlist().reduce((sum, item) => sum + (item.quantity || 1), 0);

// =============================================================================
// HOOK
// =============================================================================

export function useWishlistCount() {
  const [count, setCount] = useState(getWishlistTotalQty());

  useEffect(() => {
    const sync = () => setCount(getWishlistTotalQty());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return count;
}
