// frontend/src/utils/pdfGenerator.js

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const downloadPdf = async (elementId, fileName) => {
  // Find the element on the page that you want to capture
  const input = document.getElementById(elementId);
  if (!input) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    // Use html2canvas to capture the element as a canvas image
    const canvas = await html2canvas(input, {
      scale: 2, // Increase scale for better resolution
      useCORS: true, // Important for images, if any
      backgroundColor: '#111827', // A dark background for consistency
    });

    // Get the image data from the canvas
    const imgData = canvas.toDataURL('image/png');

    // Calculate the dimensions for the PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
    });

    // Add the image to the PDF and save it
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${fileName}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};