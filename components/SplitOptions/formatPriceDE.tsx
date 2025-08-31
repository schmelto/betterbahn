"use client";
// Hilfsfunktion zur Formatierung von Preisen mit deutschem Komma
export const formatPriceDE = (price: number) => `${price.toFixed(2).replace(".", ",")}€`;
