"use strict";

// Dibuja el reporte con texto nativo del lienzo para conservar tildes y nombres completos.
async function exportReportPDF() {
  const button = document.querySelector("#export-pdf");
  if (button) button.disabled = true;
  try {
    if (!window.PDFLib?.PDFDocument) throw new Error("No se cargó la herramienta local para crear PDF.");
    if (typeof database === "undefined" || !database) throw new Error("No se encontraron datos para el reporte.");

    const { PDFDocument } = window.PDFLib;
    const pdf = await PDFDocument.create();
    const pageWidth = 792;
    const pageHeight = 612;
    const scale = 2;
    const active = database.loans.filter((loan) => loan.returned === null);
    const overdue = active
      .filter((loan) => {
        const due = loan.dueDate ?? loan.due ?? loan.returnBy ?? loan.limitDate;
        return typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due) && due < reportPDFToday();
      })
      .map((loan) => {
        const due = loan.dueDate ?? loan.due ?? loan.returnBy ?? loan.limitDate;
        const reader = database.readers.find((item) => item.id === loan.readerId);
        const book = database.books.find((item) => item.id === loan.bookId);
        const title = loan.title || book?.title || "Libro retirado del catálogo";
        return { title, reader: reader?.name || "Lector no registrado", due };
      })
      .sort((a, b) => a.due.localeCompare(b.due));
    const totalCopies = database.books.reduce((sum, book) => sum + book.copies, 0);
    const available = database.books.reduce((sum, book) => sum + Math.max(0, availableCopies(book)), 0);
    const counts = new Map();
    database.loans.forEach((loan) => {
      const book = database.books.find((item) => item.id === loan.bookId);
      const title = book?.title || loan.title || "Libro retirado del catálogo";
      counts.set(title, (counts.get(title) || 0) + 1);
    });
    const topBooks = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .slice(0, 5);
    const canvases = [];
    const dateLabel = reportPDFFormatDate(reportPDFToday());

    // Crea una página en escala 2x para que el texto siga nítido al imprimir.
    function createPage() {
      const canvas = document.createElement("canvas");
      canvas.width = pageWidth * scale;
      canvas.height = pageHeight * scale;
      const context = canvas.getContext("2d");
      context.scale(scale, scale);
      context.fillStyle = "#fffef8";
      context.fillRect(0, 0, pageWidth, pageHeight);
      context.fillStyle = "#201c31";
      context.font = "bold 21px Arial, sans-serif";
      context.fillText("Biblioteca · Reporte y estadísticas", 36, 38);
      context.font = "12px Arial, sans-serif";
      context.fillStyle = "#625d75";
      context.fillText(`Generado el ${dateLabel}`, 36, 59);
      context.strokeStyle = "#b6bdf1";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(36, 72);
      context.lineTo(pageWidth - 36, 72);
      context.stroke();
      context.font = "9px Arial, sans-serif";
      context.fillStyle = "#625d75";
      context.fillText(`Biblioteca · Página ${canvases.length + 1}`, 36, pageHeight - 14);
      canvases.push(canvas);
      return context;
    }

    // Ajusta las líneas al ancho disponible y devuelve la siguiente coordenada vertical.
    function wrappedLines(context, text, maxWidth, font) {
      context.font = font;
      const lines = [];
      let line = "";
      for (const word of String(text).split(/\s+/)) {
        let remainder = word;
        while (remainder && context.measureText(line ? `${line} ${remainder}` : remainder).width > maxWidth) {
          if (line) {
            lines.push(line);
            line = "";
          } else {
            let part = "";
            while (remainder && context.measureText(part + remainder[0]).width <= maxWidth) {
              part += remainder[0];
              remainder = remainder.slice(1);
            }
            if (!part) {
              part = remainder[0];
              remainder = remainder.slice(1);
            }
            lines.push(part);
          }
        }
        if (!remainder) continue;
        line = line ? `${line} ${remainder}` : remainder;
      }
      if (line) lines.push(line);
      return lines;
    }

    function drawWrapped(context, text, x, y, maxWidth, lineHeight, font, color) {
      const lines = wrappedLines(context, text, maxWidth, font);
      context.font = font;
      context.fillStyle = color;
      lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
      return y + lines.length * lineHeight;
    }

    // Añade una tarjeta de métrica con el aspecto y los colores del proyecto.
    function drawMetric(context, x, y, label, value, detail, color, valueColor = "#201c31") {
      context.fillStyle = color;
      context.strokeStyle = "#201c31";
      context.lineWidth = 1.5;
      context.beginPath();
      context.roundRect(x, y, 171, 82, 7);
      context.fill();
      context.stroke();
      context.fillStyle = valueColor;
      context.font = "bold 9px Arial, sans-serif";
      context.fillText(label.toUpperCase(), x + 12, y + 18);
      context.font = "bold 25px Arial, sans-serif";
      context.fillText(String(value), x + 12, y + 46);
      context.font = "10px Arial, sans-serif";
      context.fillText(detail, x + 12, y + 66);
    }

    // Dibuja cada libro en una fila para que el título completo no se encime.
    function drawRanking(context, startY) {
      context.fillStyle = "#201c31";
      context.font = "bold 14px Arial, sans-serif";
      context.fillText("Libros más prestados", 36, startY);
      if (!topBooks.length) {
        context.font = "11px Arial, sans-serif";
        context.fillStyle = "#625d75";
        context.fillText("Todavía no hay préstamos registrados.", 36, startY + 24);
        return startY + 38;
      }
      const titleX = 36;
      const countX = 348;
      const barX = 380;
      const barWidth = 350;
      const max = topBooks[0][1];
      const colors = ["#ff65aa", "#3043df", "#ffda4b", "#209c70", "#201c31"];
      let y = startY + 22;
      topBooks.forEach(([title, count], index) => {
        const lines = wrappedLines(context, title, 290, "10px Arial, sans-serif");
        drawWrapped(context, title, titleX, y, 290, 12, "10px Arial, sans-serif", "#201c31");
        context.font = "bold 10px Arial, sans-serif";
        context.fillStyle = "#201c31";
        context.textAlign = "right";
        context.fillText(String(count), countX, y + 2);
        context.textAlign = "left";
        const width = Math.max(2, Math.round((count / max) * barWidth));
        const rowHeight = Math.max(12, lines.length * 12);
        context.fillStyle = colors[index];
        context.strokeStyle = "#201c31";
        context.lineWidth = 1;
        context.fillRect(barX, y - 8, width, 10);
        context.strokeRect(barX, y - 8, width, 10);
        y += rowHeight + 5;
      });
      return y;
    }

    // Dibuja la primera página con el resumen y las estadísticas actuales.
    let context = createPage();
    drawMetric(context, 36, 88, "Préstamos activos", active.length, "En curso", "#c2c8ff");
    drawMetric(context, 219, 88, "Devoluciones vencidas", overdue.length, "Con fecha vencida", "#ffb0d3");
    drawMetric(context, 402, 88, "Usuarios registrados", database.readers.length, "Lectores", "#ffda4b");
    drawMetric(context, 585, 88, "Libros en catálogo", database.books.length, `${available} de ${totalCopies} disponibles`, "#a8e3c8");
    let y = drawRanking(context, 194) + 18;

    // Divide la tabla en páginas y envuelve títulos o nombres extensos completos.
    function drawOverdueHeading(context, continued = false) {
      context.fillStyle = "#201c31";
      context.font = "bold 14px Arial, sans-serif";
      context.fillText(continued ? "Devoluciones vencidas · continuación" : "Devoluciones vencidas", 36, y);
      context.font = "bold 10px Arial, sans-serif";
      context.fillText("LIBRO", 36, y + 20);
      context.fillText("LECTOR", 440, y + 20);
      context.fillText("VENCE", 694, y + 20);
      y += 38;
    }
    if (y > pageHeight - 160) {
      context = createPage();
      y = 99;
    }
    drawOverdueHeading(context);
    function drawOverdueRow(row) {
      context.strokeStyle = "#e7dce3";
      context.beginPath();
      context.moveTo(36, y - 12);
      context.lineTo(pageWidth - 36, y - 12);
      context.stroke();
      const titleBottom = drawWrapped(context, row.title, 36, y, 390, 12, "10px Arial, sans-serif", "#201c31");
      const readerBottom = drawWrapped(context, row.reader, 440, y, 240, 12, "10px Arial, sans-serif", "#201c31");
      context.font = "10px Arial, sans-serif";
      context.fillStyle = "#201c31";
      context.fillText(reportPDFFormatDate(row.due), 694, y);
      y = Math.max(titleBottom, readerBottom, y + 12) + 7;
    }
    if (!overdue.length) {
      context.font = "10px Arial, sans-serif";
      context.fillStyle = "#625d75";
      context.fillText("No hay devoluciones vencidas con fecha límite registrada.", 36, y);
    } else {
      for (const row of overdue) {
        const titleHeight = wrappedLines(context, row.title, 390, "10px Arial, sans-serif").length * 12;
        const readerHeight = wrappedLines(context, row.reader, 240, "10px Arial, sans-serif").length * 12;
        const rowHeight = Math.max(titleHeight, readerHeight, 12) + 7;
        if (y + rowHeight > pageHeight - 35) {
          context = createPage();
          y = 99;
          drawOverdueHeading(context, true);
        }
        drawOverdueRow(row);
      }
    }

    // Convierte cada página del lienzo en una página PDF horizontal.
    for (let index = 0; index < canvases.length; index += 1) {
      const image = await pdf.embedPng(canvases[index].toDataURL("image/png"));
      const page = pdf.addPage([pageWidth, pageHeight]);
      page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    }

    const bytes = await pdf.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Biblioteca_${reportPDFToday()}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Reporte PDF descargado.");
  } catch (error) {
    notify(error instanceof Error ? `No se pudo generar el PDF: ${error.message}` : "No se pudo generar el PDF.");
  } finally {
    if (button) button.disabled = false;
  }
}

// Devuelve la fecha local para etiquetar y nombrar el archivo.
function reportPDFToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Formatea fechas ISO sin convertirlas a otra zona horaria.
function reportPDFFormatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day))).replaceAll(".", "");
}
