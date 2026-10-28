"use strict";

// Préstamos: disponibilidad, registro, devoluciones e historial compartido.

const loanForm = $("#loan-form");
const loanReaderSelect = $("#loan-reader");
const loanBookSelect = $("#loan-book");
const loanDateInput = $("#loan-date");
const loanDueDateInput = $("#loan-limit");

// Devuelve la fecha local en formato ISO sin convertirla a UTC.
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Calcula el siguiente día del calendario para evitar desfases de zona horaria.
function dateAfterDays(date, days) {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + days);
  return localDateString(next);
}

// Asigna códigos únicos incluso si hay préstamos antiguos sin identificador.
function loansWithIds() {
  const reservedIds = new Set(database.loans
    .map((loan) => loan.id)
    .filter((id) => Number.isInteger(id) && id > 0));
  const assignedIds = new Set();
  let nextId = Math.max(0, ...reservedIds) + 1;

  return database.loans.map((loan, index) => {
    if (Number.isInteger(loan.id) && loan.id > 0 && !assignedIds.has(loan.id)) {
      assignedIds.add(loan.id);
      return { ...loan, id: loan.id, index };
    }
    while (reservedIds.has(nextId) || assignedIds.has(nextId)) nextId += 1;
    const id = nextId;
    assignedIds.add(id);
    nextId += 1;
    return { ...loan, id, index };
  });
}

// Actualiza la fecha y el sello del formulario.
function updateLoanDatePreview() {
  const stamp = $(".stamp-date");
  if (!stamp || !loanDueDateInput.value) return;
  const date = new Date(`${loanDueDateInput.value}T12:00:00`);
  const parts = new Intl.DateTimeFormat("es-NI", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC"
  }).format(date).replaceAll(".", "").toUpperCase().split(" ");
  stamp.textContent = `${parts[0]} ${parts[1]} ${parts[2]}`;
}

// Carga lectores y libros que todavía tienen ejemplares disponibles.
function renderLoanOptions() {
  if (!loanReaderSelect || !loanBookSelect) return;
  const previousReader = loanReaderSelect.value;
  const previousBook = loanBookSelect.value;

  loanReaderSelect.innerHTML = '<option value="">Seleccione un lector...</option>'
    + database.readers.map((reader) =>
      `<option value="${reader.id}">${escapeHTML(reader.name)} · C-${reader.id}</option>`
    ).join("");
  loanBookSelect.innerHTML = '<option value="">Seleccione un libro...</option>'
    + database.books.filter((book) => availableCopies(book) > 0).map((book) =>
      `<option value="${book.id}">${escapeHTML(book.title)} · ${availableCopies(book)} disponibles</option>`
    ).join("");

  if (database.readers.some((reader) => String(reader.id) === previousReader)) {
    loanReaderSelect.value = previousReader;
  }
  if (database.books.some((book) => book.id > 0
      && String(book.id) === previousBook && availableCopies(book) > 0)) {
    loanBookSelect.value = previousBook;
  }
  const code = $("#loan-form-code");
  if (code) {
    const nextId = Math.max(0, ...loansWithIds().map((loan) => loan.id)) + 1;
    code.textContent = `Nº P-${String(nextId).padStart(4, "0")}`;
  }
}

// Calcula el estado del préstamo usando solo fechas límite guardadas.
function loanStatus(loan, today) {
  if (!loan.dueDate) return "no-date";
  if (loan.dueDate < today) return "overdue";
  if (loan.dueDate === today) return "today";
  return "ontime";
}

// Dibuja las columnas y sus contadores a partir de los préstamos activos.
function renderLoans() {
  const grid = $(".loans-grid");
  if (!grid) return;
  renderLoanOptions();
  const today = localDateString();
  const columns = [
    { key: "ontime", title: "A tiempo", color: "bg-green", stamp: "green-stamp" },
    { key: "today", title: "Vence hoy", color: "bg-yellow", stamp: "yellow-stamp" },
    { key: "overdue", title: "Atrasados", color: "bg-pink", stamp: "red-stamp" },
    { key: "no-date", title: "Sin fecha límite", color: "bg-blue", stamp: "blue-stamp" }
  ];
  const activeLoansList = loansWithIds().filter((loan) => loan.returned === null);
  const grouped = Object.fromEntries(columns.map((column) => [column.key, []]));

  activeLoansList.forEach((loan) => grouped[loanStatus(loan, today)].push(loan));
  grid.innerHTML = columns.map((column) => {
    const loans = grouped[column.key];
    const cards = loans.map((loan) => {
      const reader = database.readers.find((item) => item.id === loan.readerId);
      const title = loan.title || database.books.find((item) => item.id === loan.bookId)?.title || "Libro retirado del catálogo";
      const readerName = reader?.name || "Lector retirado del registro";
      const stampText = loan.dueDate
        ? `${column.key === "today" ? "VENCE HOY" : "LÍMITE"}<br>${escapeHTML(formatDate(loan.dueDate))}`
        : "SIN FECHA<br>LÍMITE";
      return `
        <article class="loan-card paper">
          <div class="loan-card-info">
            <span class="small-code">P-${String(loan.id).padStart(4, "0")}</span>
            <strong>${escapeHTML(title)}</strong>
            <span>${escapeHTML(readerName)}</span>
            <span class="loan-borrowed">Prestado: ${escapeHTML(formatDate(loan.borrowed))}</span>
            <div class="mini-stamp ${column.stamp}">${stampText}</div>
          </div>
          <button class="button text-link" type="button" data-return-loan="${loan.index}">Registrar devolución</button>
        </article>`;
    }).join("") || '<p class="loans-empty">No hay préstamos en esta columna.</p>';

    return `
      <section class="loan-column" aria-label="${column.title}">
        <div class="column-header ${column.color}">
          <h3>${column.title}</h3>
          <span class="count-badge">${loans.length}</span>
        </div>
        <div class="column-content">${cards}</div>
      </section>`;
  }).join("");

  const total = $(".active-loans-section .result-count");
  if (total) total.textContent = `${activeLoansList.length} préstamos activos`;
}

// Registra el préstamo solo después de confirmar el guardado local.
function submitLoan(event) {
  event.preventDefault();
  const readerId = Number(loanReaderSelect.value);
  const bookId = Number(loanBookSelect.value);
  const borrowed = loanDateInput.value;
  const dueDate = loanDueDateInput.value;
  const reader = database.readers.find((item) => item.id === readerId);
  const book = database.books.find((item) => item.id === bookId);

  if (!reader || !book || availableCopies(book) < 1) {
    return notify("Selecciona un lector y un libro con ejemplares disponibles.");
  }
  if (!borrowed || !dueDate || dueDate < borrowed) {
    return notify("La fecha límite debe ser igual o posterior a la fecha del préstamo.");
  }

  const existingIds = loansWithIds().map((loan) => loan.id);
  const nextId = Math.max(0, ...existingIds) + 1;
  const loan = {
    id: nextId,
    bookId,
    readerId,
    title: book.title,
    borrowed,
    dueDate,
    returned: null
  };
  if (!saveDatabase({ ...database, loans: [...database.loans, loan] })) return;

  loanForm.reset();
  loanDateInput.value = localDateString();
  loanDueDateInput.value = dateAfterDays(loanDateInput.value, 14);
  updateLoanDatePreview();
  renderLoanOptions();
  renderLoans();
  renderBooks();
  renderReaders();
  notify("Préstamo registrado correctamente.");
}

// Marca una devolución y devuelve un ejemplar a la disponibilidad del catálogo.
function returnLoan(index) {
  const loan = database.loans[index];
  if (!loan || loan.returned !== null) return;
  if (loan.borrowed > localDateString()) return notify("La devolución no puede ser anterior al préstamo.");
  const nextLoans = database.loans.map((item, itemIndex) => itemIndex === index
    ? { ...item, id: loansWithIds()[itemIndex].id, returned: localDateString() }
    : item);
  if (!saveDatabase({ ...database, loans: nextLoans })) return;
  renderLoans();
  renderLoanOptions();
  renderBooks();
  renderReaders();
  notify(`Devolución registrada: ${loan.title || "libro"}.`);
}

// Conecta los formularios sin esperar DOMContentLoaded: los scripts defer respetan su orden.
if (loanForm) loanForm.addEventListener("submit", submitLoan);
if (loanDueDateInput) loanDueDateInput.addEventListener("change", updateLoanDatePreview);
const loansGrid = $(".loans-grid");
if (loansGrid) {
  loansGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-return-loan]");
    if (!button) return;
    const loan = database.loans[Number(button.dataset.returnLoan)];
    if (!loan || loan.returned !== null) return;
    const title = loan.title || "este libro";
    if (window.confirm(`¿Registrar la devolución de ${title}?`)) {
      returnLoan(Number(button.dataset.returnLoan));
    }
  });
}

if (loanDateInput && loanDueDateInput) {
  loanDateInput.value = localDateString();
  loanDueDateInput.value = dateAfterDays(loanDateInput.value, 14);
  updateLoanDatePreview();
}
renderLoanOptions();
