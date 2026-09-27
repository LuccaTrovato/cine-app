import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FacturacionDia, VentaPorPelicula } from './reportes.service';

@Injectable({ providedIn: 'root' })
export class ExportService {
  /** Exporta el reporte de facturacion consolidado a un documento PDF. */
  exportarFacturacionPdf(datos: FacturacionDia[], ventas: VentaPorPelicula[]): void {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('CineApp - Reporte de Facturacion', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Fecha', 'Entradas vendidas', 'Facturacion ($)']],
      body: datos.map((d) => [d.fecha, d.cantidadEntradas.toString(), d.total.toFixed(2)]),
    });

    const totalGeneral = datos.reduce((acc, d) => acc + d.total, 0);
    const finalY1 = (doc as any).lastAutoTable.finalY + 6;
    doc.text(`Total facturado: $${totalGeneral.toFixed(2)}`, 14, finalY1);

    autoTable(doc, {
      startY: finalY1 + 6,
      head: [['Pelicula', 'Formato', 'Entradas', 'Total ($)']],
      body: ventas.map((v) => [v.titulo, v.formato, v.cantidad.toString(), v.total.toFixed(2)]),
    });

    doc.save(`reporte-facturacion-${Date.now()}.pdf`);
  }

  /** Exporta el detalle de facturacion y ventas a un libro Excel (.xlsx) con dos hojas. */
  exportarFacturacionExcel(datos: FacturacionDia[], ventas: VentaPorPelicula[]): void {
    const libro = XLSX.utils.book_new();

    const hojaFacturacion = XLSX.utils.json_to_sheet(
      datos.map((d) => ({ Fecha: d.fecha, 'Entradas vendidas': d.cantidadEntradas, 'Facturacion ($)': d.total }))
    );
    XLSX.utils.book_append_sheet(libro, hojaFacturacion, 'Facturacion por dia');

    const hojaVentas = XLSX.utils.json_to_sheet(
      ventas.map((v) => ({ Pelicula: v.titulo, Formato: v.formato, Entradas: v.cantidad, 'Total ($)': v.total }))
    );
    XLSX.utils.book_append_sheet(libro, hojaVentas, 'Ventas por pelicula');

    XLSX.writeFile(libro, `reporte-facturacion-${Date.now()}.xlsx`);
  }
}
