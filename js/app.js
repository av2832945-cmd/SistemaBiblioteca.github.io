"use strict";

// Conecta los botones y formularios e inicia la aplicación. Cargar al final.

// Cambia de módulo mediante enlaces que también funcionan con Atrás y Adelante.
function navigate(focus = false) {
  const pages = {
    libros: ["#books-page", "#books-heading", "Libros"],
    usuarios: ["#readers-page", "#readers-heading", "Usuarios"],
    prestamos: ["#loans-page", "#loans-heading", "Préstamos"],
    reportes: ["#reports-page", "#reports-heading", "Reportes"]
  };
  const requestedPage = location.hash.slice(1);
  const page = Object.hasOwn(pages, requestedPage) ? requestedPage : "libros";
  Object.entries(pages).forEach(([name, [section]]) => {
    $(section).hidden = name !== page;
  });
  document.querySelectorAll("[data-page]").forEach((link) => {
    if (link.dataset.page === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (page === "libros") renderBooks();
  if (page === "usuarios") showHistory(selectedReader);
  if (page === "prestamos") renderLoans();
  if (page === "reportes") renderReports();
  document.title = `${pages[page][2]} · Biblioteca`;
  if (focus && !$("#app-screen").hidden) $(pages[page][1]).focus();
}

// Eventos de los formularios, botones y navegación.
$("#login-form").addEventListener("submit", login);
$("#logout").addEventListener("click", logout);
$("#export-pdf").addEventListener("click", exportReportPDF);
$("#book-search").addEventListener("input", renderBooks);
$("#reader-search").addEventListener("input", renderReaders);
$("#new-book").addEventListener("click", () => openBookForm());
$("#cancel-book").addEventListener("click", () => openBookForm());
$("#book-form").addEventListener("submit", submitBook);
$("#new-reader").addEventListener("click", () => openReaderForm());
$("#cancel-reader").addEventListener("click", () => showHistory(selectedReader, true));
$("#reader-form").addEventListener("submit", submitReader);
$(".filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
  renderBooks();
});
$("#book-list").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-book]");
  const remove = event.target.closest("[data-delete-book]");
  if (edit) openBookForm(Number(edit.dataset.editBook));
  if (remove) requestDelete(Number(remove.dataset.deleteBook));
});
$("#reader-list").addEventListener("click", (event) => {
  const edit = event.target.closest("[data-edit-reader]");
  const history = event.target.closest("[data-history]");
  if (edit) openReaderForm(Number(edit.dataset.editReader));
  if (history) showHistory(Number(history.dataset.history), true);
});
$("#delete-dialog").addEventListener("close", () => {
  if ($("#delete-dialog").returnValue === "delete") deleteBook();
  pendingDeletion = null;
});
window.addEventListener("hashchange", () => navigate(true));

try {
  if (sessionStorage.getItem(SESSION_KEY) === "active") showApp();
} catch { /* El login sigue disponible si sessionStorage está deshabilitado. */ }
