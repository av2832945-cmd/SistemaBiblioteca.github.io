"use strict";

// Funciones compartidas: búsquedas, mensajes, HTML seguro y fechas.

const $ = (selector) => document.querySelector(selector);
let toastTimer;

// Escapa los valores antes de incorporarlos al HTML de las fichas.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

// Permite buscar sin distinguir mayúsculas ni tildes.
function normalize(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Informa del resultado de una acción sin interrumpir el formulario.
function notify(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 6000);
}

// Muestra los errores dentro del formulario correspondiente.
function formError(selector, message = "") {
  $(selector).textContent = message;
  $(selector).hidden = !message;
}

// Presenta fechas sin desplazamientos por zona horaria.
function formatDate(value) {
  const options = {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC"
  };
  return new Intl.DateTimeFormat("es-NI", options)
    .format(new Date(`${value}T12:00:00Z`))
    .replaceAll(".", "")
    .toUpperCase();
}
