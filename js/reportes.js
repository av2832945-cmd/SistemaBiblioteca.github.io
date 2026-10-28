"use strict";

// Actualiza las estadísticas desde la misma base local que usan los demás módulos.

const REPORT_BAR_COLORS = ["bar-pink", "bar-blue", "bar-yellow", "bar-green", "bar-dark"];

// Devuelve una fecha local ISO; las fechas se guardan como YYYY-MM-DD.
function reportToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Obtiene un vencimiento guardado en cualquiera de los nombres usados por los formularios.
function loanDueDate(loan) {
  const value = loan.dueDate ?? loan.due ?? loan.returnBy ?? loan.limitDate;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

// Busca libros con nombre histórico para que el informe sobreviva a cambios del catálogo.
function reportBookTitle(loan) {
  return database.books.find((book) => book.id === loan.bookId)?.title || loan.title || "Libro retirado del catálogo";
}

// Dibuja el ranking de títulos según los préstamos registrados.
function renderTopBorrowedBooks() {
  const chart = $(".shelf-chart");
  if (!chart) return;

  const counts = new Map();
  for (const loan of database.loans) {
    const title = reportBookTitle(loan);
    counts.set(title, (counts.get(title) || 0) + 1);
  }
  const topBooks = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, 5);

  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", topBooks.length
    ? `Libros más prestados: ${topBooks.map(([title, count]) => `${title}, ${count} préstamos`).join("; ")}`
    : "Todavía no hay préstamos registrados.");
  chart.innerHTML = topBooks.length
    ? topBooks.map(([title, count], index) => {
      const height = Math.max(14, Math.round((count / topBooks[0][1]) * 100));
      return `<div class="chart-bar ${REPORT_BAR_COLORS[index]}" style="height: ${height}%">
        <span class="bar-value">${count}</span>
        <span class="bar-label">${escapeHTML(title)}</span>
      </div>`;
    }).join("")
    : '<p class="report-empty">Todavía no hay préstamos registrados.</p>';
}

// Dibuja los préstamos vencidos cuando su fecha límite está registrada.
function renderOverdueLoans() {
  const list = $(".overdue-list");
  if (!list) return;
  const today = reportToday();
  const overdue = database.loans
    .filter((loan) => loan.returned === null && loanDueDate(loan) && loanDueDate(loan) < today)
    .map((loan) => {
      const due = loanDueDate(loan);
      const daysLate = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86400000);
      const reader = database.readers.find((item) => item.id === loan.readerId);
      return { loan, due, daysLate, reader };
    })
    .sort((a, b) => a.due.localeCompare(b.due));

  const badge = $(".overdue-header .count-badge");
  if (badge) badge.textContent = String(overdue.length);
  list.innerHTML = overdue.length
    ? overdue.map(({ loan, due, daysLate, reader }) => `<li>
      <div class="overdue-info">
        <strong>${escapeHTML(reportBookTitle(loan))}</strong>
        <span>${escapeHTML(reader?.name || "Lector no registrado")} · vence ${formatDate(due)}</span>
      </div>
      <span class="mini-stamp red-stamp">${daysLate} ${daysLate === 1 ? "DÍA" : "DÍAS"}</span>
    </li>`).join("")
    : '<li class="report-empty">No hay devoluciones vencidas.</li>';
}

// Actualiza conteos y textos de resumen con los datos guardados actualmente.
function renderReportMetrics() {
  const cards = document.querySelectorAll(".metrics-grid .metric-card");
  const activeLoans = database.loans.filter((loan) => loan.returned === null).length;
  const today = reportToday();
  const overdueCount = database.loans.filter((loan) =>
    loan.returned === null && loanDueDate(loan) && loanDueDate(loan) < today
  ).length;
  const totalCopies = database.books.reduce((total, book) => total + book.copies, 0);
  const available = database.books.reduce((total, book) => total + Math.max(0, availableCopies(book)), 0);
  const values = [
    [activeLoans, `${activeLoans} en curso`],
    [overdueCount, "Con fecha vencida"],
    [database.readers.length, "Lectores registrados"],
    [database.books.length, `${available} de ${totalCopies} ejemplares disponibles`]
  ];
  cards.forEach((card, index) => {
    const value = card.querySelector(".metric-value");
    const sub = card.querySelector(".metric-sub");
    if (!value || !values[index]) return;
    value.textContent = values[index][0].toLocaleString("es-NI");
    if (sub) sub.textContent = values[index][1];
  });
}

// Actualiza el reporte al abrir su módulo y después de cambios en los datos.
function renderReports() {
  if (typeof database === "undefined" || !database) return;
  renderReportMetrics();
  renderTopBorrowedBooks();
  renderOverdueLoans();
}

