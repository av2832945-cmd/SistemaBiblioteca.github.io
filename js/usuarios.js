"use strict";

// Lectores: búsquedas, registro, edición e historial.

const COLORS = ["blue", "pink", "yellow", "green"];
let editingReader = null;
let selectedReader = database.readers[1]?.id ?? database.readers[0]?.id;

// Dibuja los carnés y obtiene sus contadores del historial de cada lector.
function renderReaders() {
  const query = normalize($("#reader-search").value);
  const readers = database.readers.filter((reader) => normalize(`${reader.name} ${reader.email} ${reader.phone} C-${reader.id}`).includes(query));
  $("#reader-list").innerHTML = readers.map((reader) => {
    const color = COLORS[(reader.id - 1001) % COLORS.length];
    const initials = reader.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
    const count = database.loans.filter((loan) => loan.readerId === reader.id && loan.returned === null).length;
    return `
      <article class="reader-card ${reader.id === selectedReader ? "selected" : ""}">
        <div class="reader-band ${color}">
          <span>CARNÉ DE LECTOR</span>
          <span>C-${reader.id}</span>
        </div>
        <div class="reader-card-body">
          <div class="reader-name">
            <span class="avatar ${color}" aria-hidden="true">${escapeHTML(initials)}</span>
            <h2>${escapeHTML(reader.name)}</h2>
          </div>
          <p class="reader-contact">${escapeHTML(reader.email)}<br>Tel. ${escapeHTML(reader.phone)}</p>
          <div class="reader-stock">
            <span class="barcode" aria-hidden="true"></span>
            <p><strong>${count}</strong>EN PRÉSTAMO</p>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" data-edit-reader="${reader.id}" aria-label="Editar a ${escapeHTML(reader.name)}">Editar</button>
          <button class="history-action" type="button" data-history="${reader.id}" aria-label="Historial de ${escapeHTML(reader.name)}">Historial</button>
        </div>
      </article>`;
  }).join("") || '<div class="empty-state"><strong>No se encontraron lectores.</strong>Prueba otra búsqueda o registra un nuevo lector.</div>';
  $("#reader-count").textContent = `Mostrando ${readers.length} de ${database.readers.length} lectores`;
}

// Consulta el historial del lector, incluidos los libros retirados del catálogo.
function showHistory(id, focus = false) {
  selectedReader = id;
  $("#reader-editor").hidden = true;
  $("#history-panel").hidden = false;
  const reader = database.readers.find((item) => item.id === id);
  if (!reader) {
    $("#history-panel").innerHTML = '<p class="history-empty">Selecciona un lector para consultar su historial.</p>';
    return;
  }
  const loans = database.loans.filter((loan) => loan.readerId === id).sort((a, b) => b.borrowed.localeCompare(a.borrowed));
  const active = loans.filter((loan) => loan.returned === null).length;
  const rows = loans.map((loan) => `
    <tr>
      <td>${escapeHTML(loan.title)}</td>
      <td>${formatDate(loan.borrowed)}</td>
      <td class="${loan.returned ? "loan-returned" : "loan-open"}">
        ${loan.returned ? formatDate(loan.returned) : "EN PRÉSTAMO"}
      </td>
    </tr>`).join("");

  const historyContent = loans.length ? `
    <table class="history-table">
      <caption class="visually-hidden">Historial de ${escapeHTML(reader.name)}</caption>
      <thead>
        <tr>
          <th scope="col">LIBRO</th>
          <th scope="col">PRESTADO</th>
          <th scope="col">DEVUELTO</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<p class="history-empty">Este lector todavía no tiene préstamos registrados.</p>';

  $("#history-panel").innerHTML = `
    <div class="history-heading">
      <span class="eyebrow">HISTORIAL DE PRÉSTAMOS</span>
      <h2 id="history-heading" tabindex="-1">${escapeHTML(reader.name)}</h2>
      <p class="history-meta">C-${reader.id} · ${escapeHTML(reader.email)}</p>
    </div>
    ${historyContent}
    <div class="history-totals">
      <span>${loans.length} préstamos</span>
      <span>${active} activos</span>
    </div>
    <div class="paper-bottom" aria-hidden="true">
      <span class="punch-hole"></span>
    </div>`;
  renderReaders();
  if (focus) $("#history-heading").focus();
}

// Abre el formulario del lector sin modificar su historial.
function openReaderForm(id = null) {
  const reader = database.readers.find((item) => item.id === id);
  editingReader = reader?.id ?? null;
  $("#reader-form").reset();
  if (reader) {
    for (const field of ["name", "email", "phone"]) {
      $("#reader-form").elements.namedItem(field).value = reader[field];
    }
  }
  $("#reader-form-heading").textContent = reader ? "Editar lector" : "Nuevo lector";
  $("#reader-form-code").textContent = `C-${reader?.id ?? database.nextReader}`;
  $("#history-panel").hidden = true;
  $("#reader-editor").hidden = false;
  formError("#reader-error");
  $("#reader-name").focus();
}

// Guarda el lector y evita registrar el mismo correo dos veces.
function submitReader(event) {
  event.preventDefault();
  const form = $("#reader-form");
  const reader = {
    id: editingReader ?? database.nextReader,
    name: form.elements.namedItem("name").value.trim(),
    email: form.elements.email.value.trim().toLowerCase(),
    phone: form.elements.phone.value.trim()
  };

  if (!reader.name || !reader.email || !reader.phone) {
    return formError("#reader-error", "Completa todos los campos; no uses solo espacios.");
  }
  const duplicateEmail = database.readers.some((item) =>
    item.id !== reader.id && item.email.toLowerCase() === reader.email
  );
  if (duplicateEmail) {
    return formError("#reader-error", "Este correo ya pertenece a otro lector.");
  }

  const next = {
    ...database,
    readers: editingReader === null
      ? [...database.readers, reader]
      : database.readers.map((item) => item.id === editingReader ? reader : item),
    nextReader: editingReader === null ? database.nextReader + 1 : database.nextReader
  };
  const message = editingReader === null ? "Lector registrado. Su historial está vacío." : "Datos del lector actualizados.";
  if (!saveDatabase(next)) return;
  showHistory(reader.id, true);
  notify(message);
}
