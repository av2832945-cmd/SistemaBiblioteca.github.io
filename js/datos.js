"use strict";

// Datos de ejemplo y almacenamiento local. Cargar primero.

const STORAGE_KEY = "biblioteca-v1";
let storageDamaged = false;
let database = loadDatabase();

// Crea datos de ejemplo coherentes entre existencias e historiales.
function seedDatabase() {
  const books = [
    { id: 1, title: "Azul", author: "Rubén Darío", signature: "861 DAR", copies: 5, isbn: "9788437605229", category: "Literatura" },
    { id: 2, title: "Cien años de soledad", author: "Gabriel García Márquez", signature: "863 GAR", copies: 6, isbn: "9788437604947", category: "Literatura" },
    { id: 3, title: "La mujer habitada", author: "Gioconda Belli", signature: "863 BEL", copies: 3, isbn: "", category: "Literatura" },
    { id: 4, title: "Rayuela", author: "Julio Cortázar", signature: "863 COR", copies: 4, isbn: "9788437604572", category: "Literatura" },
    { id: 5, title: "Pedro Páramo", author: "Juan Rulfo", signature: "863 RUL", copies: 3, isbn: "9788437604183", category: "Literatura" },
    { id: 6, title: "Breve historia del tiempo", author: "Stephen Hawking", signature: "523.1 HAW", copies: 3, isbn: "", category: "Ciencias" },
    { id: 7, title: "Código limpio", author: "Robert C. Martin", signature: "005.1 MAR", copies: 2, isbn: "", category: "Tecnología" },
    { id: 8, title: "El Güegüense", author: "Anónimo", signature: "862 ANO", copies: 4, isbn: "", category: "Historia" }
  ];
  const readers = [
    { id: 1001, name: "Carlos Méndez", email: "carlos.mendez@correo.com", phone: "8845-1290" },
    { id: 1002, name: "María López", email: "maria.lopez@correo.com", phone: "8712-3344" },
    { id: 1003, name: "Ana Gutiérrez", email: "ana.gutierrez@correo.com", phone: "8590-7781" },
    { id: 1004, name: "José Ramírez", email: "jose.ramirez@correo.com", phone: "8456-2210" },
    { id: 1005, name: "Lucía Torres", email: "lucia.torres@correo.com", phone: "8933-0412" },
    { id: 1006, name: "Pedro Castillo", email: "pedro.castillo@correo.com", phone: "8601-5578" }
  ];
  // Cada pareja representa [identificador del libro, carné del lector].
  const active = [
    [2, 1002], [1, 1002], [2, 1001], [2, 1003],
    [2, 1004], [2, 1005], [3, 1001], [3, 1004],
    [3, 1006], [4, 1004], [4, 1005], [6, 1004],
    [6, 1006], [7, 1001], [7, 1006], [8, 1003]
  ];
  const loans = active.map(([bookId, readerId], index) => ({
    id: index + 1,
    bookId,
    readerId,
    title: books.find((book) => book.id === bookId).title,
    borrowed: index === 0 ? "2026-10-20" : "2026-10-15",
    returned: null
  }));
  const returnedLoans = [
    [3, "2026-09-01", "2026-09-14"],
    [8, "2026-08-02", "2026-08-19"],
    [4, "2026-07-10", "2026-07-22"]
  ];
  returnedLoans.forEach(([bookId, borrowed, returned], index) => {
    loans.push({
      id: 17 + index,
      bookId,
      readerId: 1002,
      title: books.find((book) => book.id === bookId).title,
      borrowed,
      returned
    });
  });
  return { version: 1, nextBook: 9, nextReader: 1007, books, readers, loans };
}

// Lee el guardado local sin sobrescribir datos que no se puedan interpretar.
function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDatabase();
    const saved = JSON.parse(raw);
    if (saved.version !== 1
        || !Array.isArray(saved.books)
        || !Array.isArray(saved.readers)
        || !Array.isArray(saved.loans)
        || !Number.isInteger(saved.nextBook)
        || !Number.isInteger(saved.nextReader)) {
      throw new Error("Formato desconocido");
    }

    const validBooks = saved.books.every((book) =>
      Number.isInteger(book.id)
      && Number.isInteger(book.copies)
      && book.copies > 0
      && [book.title, book.author, book.signature, book.isbn, book.category]
        .every((value) => typeof value === "string")
    );
    const validReaders = saved.readers.every((reader) =>
      Number.isInteger(reader.id)
      && [reader.name, reader.email, reader.phone]
        .every((value) => typeof value === "string")
    );
    const validLoans = saved.loans.every((loan) =>
      Number.isInteger(loan.bookId)
      && Number.isInteger(loan.readerId)
      && typeof loan.title === "string"
      && /^\d{4}-\d{2}-\d{2}$/.test(loan.borrowed)
      && (loan.returned === null || /^\d{4}-\d{2}-\d{2}$/.test(loan.returned))
    );
    if (!validBooks || !validReaders || !validLoans) {
      throw new Error("Registros inválidos");
    }
    return saved;
  } catch {
    storageDamaged = true;
    return seedDatabase();
  }
}

// Confirma primero el guardado para no mostrar cambios que se perderían.
function saveDatabase(next) {
  if (storageDamaged) {
    notify("No se pudo leer el almacenamiento local. No se sobrescribirán tus datos; revisa el almacenamiento del navegador.");
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    database = next;
    return true;
  } catch {
    notify("No se pudo guardar. Comprueba el espacio y los permisos de almacenamiento del navegador.");
    return false;
  }
}
