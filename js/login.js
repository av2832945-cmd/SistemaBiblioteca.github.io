"use strict";

// Inicio y cierre de la sesión de demostración.

const SESSION_KEY = "biblioteca-demo-session";

// Muestra la sesión de demostración; no ofrece seguridad de servidor.
function showApp() {
  $("#login-screen").hidden = true;
  $("#app-screen").hidden = false;
  renderBooks();
  openBookForm(null, false);
  showHistory(selectedReader);
  navigate();
  if (storageDamaged) notify("No se pudo leer el guardado local. Se muestra una copia de ejemplo sin sobrescribir tus datos.");
}

// Comprueba únicamente las credenciales públicas de este prototipo.
function login(event) {
  event.preventDefault();
  const email = $("#login-email").value.trim().toLowerCase();
  const password = $("#login-password").value;
  if (email !== "lector@biblioteca.com" || password !== "biblioteca123") {
    return formError("#login-error", "NO SE ENCONTRÓ AL USUARIO. Revisa tu correo y tu clave.");
  }
  // shortcut: sesión local de demostración; conectar un servidor para uso real.
  try {
    sessionStorage.setItem(SESSION_KEY, "active");
  } catch {
    // La vista funciona aunque el navegador impida recordar la sesión.
  }
  $("#login-form").reset();
  formError("#login-error");
  showApp();
  navigate(true);
}

// Cierra la sesión y limpia los formularios, conservando el catálogo guardado.
function logout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // No había sesión persistente disponible.
  }
  $("#app-screen").hidden = true;
  $("#login-screen").hidden = false;
  $("#book-form").reset();
  $("#reader-form").reset();
  $("#book-search").value = "";
  $("#reader-search").value = "";
  $("#toast").hidden = true;
  document.title = "Biblioteca · Sistema Nº 3";
  $("#login-email").focus();
}
