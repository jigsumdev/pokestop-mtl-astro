/*
  cart.ts — PokéStop MTL
  Client-side cart management using localStorage
*/

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

const CART_KEY = "pokestop-cart";

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart-updated"));
}

export function addToCart(item: Omit<CartItem, "quantity">): void {
  const cart = getCart();
  const existing = cart.find((x) => x.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
}

export function removeFromCart(id: string): void {
  const cart = getCart().filter((x) => x.id !== id);
  saveCart(cart);
}

export function updateQuantity(id: string, delta: number): void {
  const cart = getCart();
  const item = cart.find((x) => x.id === id);
  if (!item) return;
  item.quantity = Math.max(0, item.quantity + delta);
  if (item.quantity === 0) {
    saveCart(cart.filter((x) => x.id !== id));
  } else {
    saveCart(cart);
  }
}

export function totalItems(cart: CartItem[]): number {
  return cart.reduce((sum, x) => sum + x.quantity, 0);
}

export function subtotal(cart: CartItem[]): number {
  return cart.reduce((sum, x) => sum + x.price * x.quantity, 0);
}

// Initialize product card interactivity
export function initProductCards(): void {
  document.querySelectorAll<HTMLElement>(".product-card").forEach((card) => {
    const id = card.dataset.productId!;
    const name = card.dataset.productName!;
    const price = parseFloat(card.dataset.productPrice || "0");
    const image = card.dataset.productImage!;
    const stock = parseInt(card.dataset.productStock || "1");

    // Add to cart button
    const addBtn = card.querySelector<HTMLButtonElement>(".add-cart");
    addBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (stock === 0) return;
      addToCart({ id, name, price, image });
      // Flash "added" feedback
      const info = card.querySelector<HTMLElement>(".info > div");
      if (info) {
        const msg = document.createElement("span");
        msg.className = "added-msg";
        msg.textContent = document.documentElement.lang === "fr" ? "Ajouté!" : "Added!";
        info.appendChild(msg);
        setTimeout(() => msg.remove(), 1500);
      }
    });

    // Open popup on card click
    card.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest(".add-cart")) return;
      openProductPopup({ id, name, price, image, stock });
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openProductPopup({ id, name, price, image, stock });
      }
    });
  });
}

interface PopupProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
}

let currentPopupProduct: PopupProduct | null = null;

export function openProductPopup(product: PopupProduct): void {
  currentPopupProduct = product;
  const overlay = document.getElementById("product-popup-overlay");
  const imgEl = document.getElementById("product-popup-image") as HTMLImageElement;
  const titleEl = document.getElementById("product-popup-title");
  const priceEl = document.getElementById("product-popup-price");
  const statusEl = document.getElementById("product-popup-status");
  const buyBtn = document.getElementById("product-popup-buy") as HTMLButtonElement;
  if (!overlay || !imgEl || !titleEl || !priceEl || !statusEl || !buyBtn) return;

  const lang = document.documentElement.lang;
  imgEl.src = product.image;
  imgEl.alt = product.name;
  titleEl.textContent = product.name;
  priceEl.textContent = product.price === 0 ? "Contact" : `$${product.price.toFixed(2)}`;
  statusEl.textContent = product.stock === 0
    ? (lang === "fr" ? "Vendu" : "Sold")
    : (lang === "fr" ? "Disponible" : "Available");
  statusEl.className = `popup-status ${product.stock === 0 ? "sold" : "available"}`;
  buyBtn.textContent = product.stock === 0
    ? (lang === "fr" ? "Indisponible" : "Unavailable")
    : (lang === "fr" ? "Ajouter au panier" : "Add to Cart");
  buyBtn.disabled = product.stock === 0;

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  document.getElementById("product-popup-close")?.focus();
}

export function closeProductPopup(): void {
  const overlay = document.getElementById("product-popup-overlay");
  if (overlay) {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
  currentPopupProduct = null;
}

export function initProductPopup(): void {
  const overlay = document.getElementById("product-popup-overlay");
  const closeBtn = document.getElementById("product-popup-close");
  const buyBtn = document.getElementById("product-popup-buy") as HTMLButtonElement;

  closeBtn?.addEventListener("click", closeProductPopup);
  buyBtn?.addEventListener("click", () => {
    if (currentPopupProduct && currentPopupProduct.stock > 0) {
      addToCart({
        id: currentPopupProduct.id,
        name: currentPopupProduct.name,
        price: currentPopupProduct.price,
        image: currentPopupProduct.image,
      });
    }
    closeProductPopup();
  });
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeProductPopup();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
      closeProductPopup();
    }
  });
}
