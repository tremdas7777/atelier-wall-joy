/**
 * Configuração frontend (preços exibidos na landing).
 * Pagamentos reais: Stripe via servidor Node — ver README e /admin/
 */
window.ATELIER_CONFIG = {
  currency: "EUR",
  email: "kontakt@atelierwallpapers.de",
  checkoutEssential: "/kasse.html?plan=essentiell",
  checkoutPremium: "/kasse.html?plan=premium",
  prices: {
    essentiell: { amount: "9,90", cents: 990, name: "Essenzielle Kollektion" },
    premium: { amount: "19,90", cents: 1990, name: "Premium-Kollektion" }
  }
};
