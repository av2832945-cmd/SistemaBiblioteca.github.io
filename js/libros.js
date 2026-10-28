"use strict";

// Catálogo: disponibilidad, búsquedas, altas, edición y eliminación.

let editingBook = null;
let activeFilter = "all";
let pendingDeletion = null;

// Genera el código visible de cada ficha.
function bookCode(id) {
  return `L-${String(id).padStart(3, "0")}`;
}

// Calcula los ejemplares prestados a partir del historial.
function activeLoans(bookId) {
  return database.loans.filter((loan) => loan.bookId === bookId && loan.returned === null).length;
}

// Resta los préstamos activos de las existencias totales.
function availableCopies(book) {
  return book.copies - activeLoans(book.id);
}

// Dibuja el catálogo con sus filtros y existencias reales.
function renderBooks() {
  const query = normalize($("#book-search").value);
  const books = database.books.filter((book) => {
    const available = availableCopies(book);
    const searchableText = [
      book.title, book.author, book.signature,
      book.isbn, book.category, bookCode(book.id)
    ].join(" ");
    const matchesSearch = normalize(searchableText).includes(query);
    const matchesFilter = activeFilter === "all"
      || (activeFilter === "available" && available > 0)
      || (activeFilter === "empty" && available === 0);

    return matchesSearch && matchesFilter;
  });
  $("#book-list").innerHTML = books.map((book) => {
    const available = availableCopies(book);
    const status = available === 0 ? "AGOTADO" : available === 1 ? "QUEDA 1" : "DISPONIBLE";
    const bars = Array.from({ length: Math.min(book.copies, 6) }, (_, i) => `<i class="${i < Math.min(available, 6) ? "filled" : ""}"></i>`).join("");
    return `
      <article class="book-card">
        <div class="card-meta">
          <span>${escapeHTML(book.signature)}</span>
          <span>${bookCode(book.id)}</span>
        </div>
        <div class="book-card-body">
          <div class="book-title-row">
            <h2>${escapeHTML(book.title)}</h2>
            <span class="stamp ${available === 0 ? "empty" : available === 1 ? "last" : "available"}">${status}</span>
          </div>
          <p class="book-author">${escapeHTML(book.author)}</p>
          <span class="category ${escapeHTML(normalize(book.category))}">${escapeHTML(book.category)}</span>
          <div class="stock">
            <span class="stock-bars" aria-hidden="true">${bars}</span>
            <span>${available} de ${book.copies} en estante</span>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" data-edit-book="${book.id}" aria-label="Editar ${escapeHTML(book.title)}">Editar</button>
          <button type="button" class="delete-action" data-delete-book="${book.id}" aria-label="Eliminar ${escapeHTML(book.title)}">Eliminar</button>
        </div>
      </article>`;
  }).join("") || '<div class="empty-state"><strong>No hay fichas para mostrar.</strong>Prueba otra búsqueda o registra un libro.</div>';
  $("#book-total").textContent = `· ${database.books.length}`;
  $("#book-count").textContent = `Mostrando ${books.length} de ${database.books.length} fichas`;
}

// Prepara el formulario para registrar o editar un libro.
function openBookForm(id = null, focus = true) {
  const book = database.books.find((item) => item.id === id);
  editingBook = book?.id ?? null;
  $("#book-form").reset();
  if (book) {
    for (const field of ["title", "author", "signature", "copies", "isbn", "category"]) {
      $("#book-form").elements.namedItem(field).value = book[field];
    }
  }
  $("#book-form-heading").textContent = book ? "Editar ficha" : "Nueva ficha";
  $("#book-form-code").textContent = bookCode(book?.id ?? database.nextBook);
  $("#book-copies").min = book ? Math.max(1, activeLoans(book.id)) : 1;
  $("#book-stock-note").textContent = book ? `${activeLoans(book.id)} ejemplares en préstamo. La disponibilidad se calcula automáticamente.` : "Los nuevos ejemplares estarán disponibles.";
  formError("#book-error");
  if (focus) $("#book-title").focus();
}

// Valida y guarda la ficha sin reducir las existencias por debajo de lo prestado.
function submitBook(event) {
  event.preventDefault();
  const form = $("#book-form");
  const book = {
    id: editingBook ?? database.nextBook,
    title: form.elements.title.value.trim(),
    author: form.elements.author.value.trim(),
    signature: form.elements.signature.value.trim(),
    copies: Number(form.elements.copies.value),
    isbn: form.elements.isbn.value.trim(),
    category: form.elements.category.value
  };

  if (!book.title || !book.author || !book.signature) {
    return formError("#book-error", "Completa título, autor y signatura; no uses solo espacios.");
  }
  if (!Number.isInteger(book.copies) || book.copies < 1
      || book.copies > 999 || book.copies < activeLoans(book.id)) {
    return formError("#book-error", "Indica de 1 a 999 ejemplares, sin bajar del número de libros prestados.");
  }

  const next = {
    ...database,
    books: editingBook === null
      ? [...database.books, book]
      : database.books.map((item) => item.id === editingBook ? book : item),
    nextBook: editingBook === null ? database.nextBook + 1 : database.nextBook
  };
  const message = editingBook === null ? "Nueva ficha registrada." : "Ficha actualizada.";
  if (!saveDatabase(next)) return;
  renderBooks();
  openBookForm(null, false);
  notify(message);
}

// Pide confirmar la eliminación y protege los libros que siguen prestados.
function requestDelete(id) {
  const book = database.books.find((item) => item.id === id);
  if (!book) return;
  if (activeLoans(id) > 0) return notify("No puedes eliminar un libro con ejemplares en préstamo.");
  pendingDeletion = id;
  $("#delete-description").textContent = `${bookCode(id)} · ${book.title}, de ${book.author}.`;
  $("#delete-dialog").returnValue = "cancel";
  $("#delete-dialog").showModal();
}

// Elimina solo la ficha; los préstamos anteriores conservan el título histórico.
function deleteBook() {
  const id = pendingDeletion;
  if (id === null || activeLoans(id) > 0) return;
  if (!saveDatabase({ ...database, books: database.books.filter((book) => book.id !== id) })) return;
  if (editingBook === id) openBookForm(null, false);
  renderBooks();
  notify("Libro eliminado del catálogo.");
}
