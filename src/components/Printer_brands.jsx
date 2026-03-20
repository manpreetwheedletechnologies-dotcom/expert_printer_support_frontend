import { useState, useEffect } from "react";
import { API_BASE } from "../lib/constants";

// ─── Placeholder Image ───────────────────────────────────────────────
const PLACEHOLDER_IMG =
  "https://images-cdn.ubuy.co.in/67cdb26d5af3ca779640523e-hp-officejet-3830-all-in-one-printer.jpg";

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
  const [count, setCount] = useState(getWishlistTotalQty);

  useEffect(() => {
    const sync = () => setCount(getWishlistTotalQty());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return count;
}

// =============================================================================
// CARD
// =============================================================================

function PrinterCard({ product }) {
  const [inWishlist, setInWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const sync = () => {
      const inList = isInWishlist(product.id);
      setInWishlist(inList);
      if (inList) {
        const item = getWishlist().find((i) => i.id === product.id);
        if (item) setQuantity(item.quantity);
      } else {
        setQuantity(1);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [product.id]);

  const handleAdd = () => {
    addToWishlist(product);
    setInWishlist(true);
    setQuantity(1);
  };

  const handleIncrease = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    updateWishlistQty(product.id, newQty);
  };

  const handleDecrease = () => {
    const newQty = quantity - 1;
    if (newQty <= 0) {
      removeFromWishlist(product.id);
      setInWishlist(false);
      setQuantity(1);
    } else {
      setQuantity(newQty);
      updateWishlistQty(product.id, newQty);
    }
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden"
      style={{ transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(53, 62, 71, 0.2)";
        e.currentTarget.querySelector("img").style.transform = "scale(1.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.borderColor = "";
        e.currentTarget.querySelector("img").style.transform = "scale(1)";
      }}
    >
      {/* Image */}
      <div className="bg-[#f7f7f7] flex items-center justify-center px-6 py-5 h-70 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          style={{ transition: "transform 0.35s ease" }}
          onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
        />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-4 pt-4 pb-5 gap-3">

        {/* Name */}
        <p className="text-[13.5px] font-semibold text-gray-800 leading-snug line-clamp-4">
          {product.name}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mt-auto">
          <span className="text-[#5695D0] font-bold text-[15px]">
            ${product.price.toFixed(2)}
          </span>
          {product.original_price > product.price && (
            <span className="text-gray-400 text-[13px] line-through">
              ${product.original_price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Wishlist Button OR Quantity Selector */}
        {!inWishlist ? (
          <button
            style={{ backgroundColor: "var(--bg-color)" }}
            onClick={handleAdd}
            className="w-full h-12 rounded-lg hover:opacity-90 text-white text-sm font-medium transition-colors duration-200 cursor-pointer"
          >
            Add to Wishlist
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full">
            <button
              style={{ backgroundColor: "var(--bg-color)" }}
              onClick={handleDecrease}
              className="flex-[0.8] h-11 rounded-lg hover:opacity-90 text-white text-xl font-bold flex items-center justify-center transition-colors duration-200 cursor-pointer"
            >
              −
            </button>
            <div className="flex-1 h-11 flex items-center justify-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg bg-white select-none">
              {String(quantity).padStart(2, "0")}
            </div>
            <button
              style={{ backgroundColor: "var(--bg-color)" }}
              onClick={handleIncrease}
              className="flex-[0.8] h-11 hover:opacity-90 rounded-lg text-white text-xl font-bold flex items-center justify-center transition-colors duration-200 cursor-pointer"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function PrinterListing() {
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/scrape/hp-printers`);
        const json = await res.json();

        // ✅ FIX: API returns { success, data: { success, count, data: [...] } }
        // so we unwrap json.data.data to get the actual printer array
        const list =
          Array.isArray(json?.data?.data)   ? json.data.data   // nested: { data: { data: [...] } }
          : Array.isArray(json?.data)        ? json.data        // flat:   { data: [...] }
          : [];

        const formatted = list.map((item, i) => ({
          id: item.id ?? `hp-${i}`,
          name: item.name,
          price: Number(item.price) || 0,
          original_price: Number(item.original_price) || Number(item.price) || 0,
          image: item.image || PLACEHOLDER_IMG,
          url: item.url || "#",
          in_stock: item.in_stock ?? true,
        }));

        setPrinters(formatted);
      } catch (err) {
        console.error("API Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-lg font-semibold">
        Loading printers...
      </div>
    );
  }

  return (
    <section className="py-14 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">
          Pick Your Printer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {printers.map((printer) => (
            <PrinterCard key={printer.id} product={printer} />
          ))}
        </div>
      </div>
    </section>
  );
}