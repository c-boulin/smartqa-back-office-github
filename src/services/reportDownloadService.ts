import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { createRoot } from 'react-dom/client';
import React from 'react';

interface ChartDataPoint {
  [key: string]: string | number;
}

interface ReportData {
  testCasesIncluded?: Array<Record<string, unknown>>;
  testRuns?: Array<Record<string, unknown>>;
  assigneeResults?: Array<{ name: string; count: number }>;
  [key: string]: unknown;
}

class ReportDownloadService {
  /**
   * Wait for all elements to be fully rendered
   */
  private async waitForElementsToRender(): Promise<void> {
    return new Promise(resolve => {
      // Wait for charts and components to fully render
      setTimeout(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 2000); // Increased wait time for complex charts
        });
      }, 1500);
    });
  }

  /**
   * Generate a chart as canvas element
   */
  private async generateChartCanvas(chartData: ChartDataPoint[], chartType: 'pie' | 'bar' | 'line'): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary container
        const container = document.createElement('div');
        container.style.width = '600px';
        container.style.height = '400px';
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.backgroundColor = '#FFFFFF';
        document.body.appendChild(container);

        // Create chart component
        let chartElement;
        if (chartType === 'pie') {
          chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
            React.createElement(PieChart, {},
              React.createElement(Pie, {
                data: chartData,
                cx: '50%',
                cy: '50%',
                innerRadius: 60,
                outerRadius: 120,
                dataKey: 'value',
                startAngle: 90,
                endAngle: 450
              }, chartData.map((entry, index) =>
                React.createElement(Cell, { key: `cell-${index}`, fill: entry.color })
              ))
            )
          );
        } else if (chartType === 'line') {
          chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
            React.createElement(LineChart, { data: chartData, margin: { top: 20, right: 30, left: 20, bottom: 40 } },
              React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: '#374151' }),
              React.createElement(XAxis, {
                dataKey: 'name',
                stroke: '#6B7280',
                fontSize: 12,
                axisLine: false,
                tickLine: false
              }),
              React.createElement(YAxis, {
                stroke: '#6B7280',
                fontSize: 12,
                axisLine: false,
                tickLine: false,
                domain: [0, 'dataMax + 1']
              }),
              React.createElement(Line, {
                type: 'monotone',
                dataKey: 'value',
                stroke: '#06B6D4',
                strokeWidth: 2,
                dot: { fill: '#06B6D4', strokeWidth: 0, r: 4 },
                activeDot: { r: 6, fill: '#06B6D4' }
              })
            )
          );
        } else {
          chartElement = React.createElement(ResponsiveContainer, { width: '100%', height: '100%' },
            React.createElement(BarChart, { data: chartData, margin: { top: 20, right: 30, left: 20, bottom: 60 } },
              React.createElement(CartesianGrid, { strokeDasharray: '3 3', stroke: '#E5E7EB' }),
              React.createElement(XAxis, { dataKey: 'name', stroke: '#374151', fontSize: 12, angle: -45, textAnchor: 'end', height: 80 }),
              React.createElement(YAxis, { stroke: '#374151', fontSize: 12, allowDecimals: false }),
              React.createElement(Bar, { dataKey: 'value', fill: '#06B6D4' })
            )
          );
        }

        // Render the chart
        const root = createRoot(container);
        root.render(chartElement);

        // Wait for chart to render, then convert to canvas
        setTimeout(async () => {
          try {
            const canvas = await html2canvas(container, {
              backgroundColor: '#FFFFFF',
              scale: 2,
              useCORS: true,
              allowTaint: true,
              logging: false
            });
            
            // Cleanup
            document.body.removeChild(container);
            resolve(canvas);
          } catch (error) {
            document.body.removeChild(container);
            reject(error);
          }
        }, 2000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Apply PDF-friendly styles to improve readability
   */
  private applyPDFStyles(element: HTMLElement): () => void {
    const originalStyles = new Map<HTMLElement, string>();
    
    // Function to recursively apply styles to all elements
    const applyStylesToElement = (el: HTMLElement) => {
      // Store original style
      originalStyles.set(el, el.style.cssText);
      
      // Apply PDF-friendly styles based on element type and classes
      const computedStyle = window.getComputedStyle(el);
      
      // Remove info icons completely
      if (el.classList.contains('lucide-info') || 
          el.tagName === 'svg' && el.querySelector('path[d*="M12 2C6.48"]') ||
          el.classList.contains('info-icon')) {
        el.style.display = 'none !important';
        return;
      }
      
      // Improve text readability
      if (computedStyle.color.includes('rgb(156, 163, 175)') || // gray-400
          computedStyle.color.includes('rgb(107, 114, 128)') || // gray-500
          computedStyle.color.includes('rgb(75, 85, 99)')) {    // gray-600
        el.style.color = '#1F2937 !important'; // Dark gray for better contrast
      }
      
      // Make white text dark for PDF
      if (computedStyle.color.includes('rgb(255, 255, 255)') || // white
          computedStyle.color.includes('rgb(243, 244, 246)')) { // gray-100
        el.style.color = '#111827 !important'; // Very dark gray
      }
      
      // Force visibility and proper display
      el.style.visibility = 'visible !important';
      el.style.opacity = '1 !important';
      if (el.style.display === 'none') {
        el.style.display = 'block !important';
      }
      
      // Improve background readability
      if (el.classList.contains('bg-slate-800') || 
          el.classList.contains('bg-slate-900') ||
          computedStyle.backgroundColor.includes('rgb(30, 41, 59)') ||
          computedStyle.backgroundColor.includes('rgb(15, 23, 42)')) {
        el.style.backgroundColor = '#F8FAFC !important'; // Light gray background
        el.style.border = '1px solid #E2E8F0 !important'; // Light border
      }
      
      // Improve card backgrounds
      if (el.classList.contains('bg-gradient-to-br') ||
          el.classList.contains('bg-gradient-to-r')) {
        el.style.background = '#FFFFFF !important'; // White background
        el.style.border = '2px solid #E2E8F0 !important'; // Light border
        el.style.borderRadius = '8px !important';
      }
      
      // Make cyan/purple text more readable
      if (computedStyle.color.includes('rgb(6, 182, 212)') || // cyan-400
          computedStyle.color.includes('rgb(139, 92, 246)')) { // purple-400
        el.style.color = '#0F172A !important'; // Very dark for contrast
        el.style.fontWeight = 'bold !important';
      }
      
      // Improve chart text
      if (el.tagName === 'text' || el.classList.contains('recharts-text')) {
        el.style.fill = '#1F2937 !important';
        el.style.color = '#1F2937 !important';
      }
      
      // Improve table styling
      if (el.tagName === 'TABLE' || el.tagName === 'TH' || el.tagName === 'TD') {
        el.style.border = '1px solid #E5E7EB !important';
        el.style.padding = '8px !important';
        if (el.tagName === 'TH') {
          el.style.backgroundColor = '#F3F4F6 !important';
          el.style.fontWeight = 'bold !important';
        }
      }
      
      // Apply to all child elements
      Array.from(el.children).forEach(child => {
        if (child instanceof HTMLElement) {
          applyStylesToElement(child);
        }
      });
    };
    
    applyStylesToElement(element);
    
    // Return cleanup function
    return () => {
      originalStyles.forEach((originalStyle, el) => {
        el.style.cssText = originalStyle;
      });
    };
  }

  /**
   * Generate chart data and add to PDF
   */
  private async addChartToPDF(
    pdf: jsPDF,
    chartData: ChartDataPoint[],
    chartType: 'pie' | 'bar',
    title: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<number> {
    try {

      // Check if we need a new page
      const pageHeight = 280;
      if (y + height > pageHeight - 30) {
        pdf.addPage();
        y = 20;
      }
      
      // Add chart title
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text(title, x, y);
      y += 15;
      
      if (chartData.length === 0) {
        // No data - add placeholder text
        pdf.setFontSize(12);
        pdf.setTextColor(107, 114, 128);
        pdf.text('No data available', x, y + 20);
        return y + 40;
      }
      
      // Generate chart canvas
      const canvas = await this.generateChartCanvas(chartData, chartType, title);
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Add chart to PDF
      pdf.addImage(imgData, 'PNG', x, y, width, height);
      
      // Add legend for pie charts
      if (chartType === 'pie') {
        const legendY = y + height + 10;
        chartData.forEach((item, index) => {
          pdf.setFontSize(10);
          pdf.setTextColor(31, 41, 59);
          pdf.text(`${item.name}: ${item.value}`, x, legendY + (index * 6));
        });
      }
      
      return y + height + 20;
    } catch (error) {
      console.error('❌ Failed to generate chart:', error);
      // Add fallback text
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Chart: ${title} (generation failed)`, x, y + 20);
      return y + 40;
    }
  }

  /**
   * Capture element as high-quality image and add to PDF with improved styling
   */
  private async captureElementAsImage(
    element: HTMLElement, 
    pdf: jsPDF, 
    x: number, 
    y: number, 
    maxWidth: number,
    addPageIfNeeded: boolean = true,
    minHeight: number = 50
  ): Promise<number> {
    try {

      // Apply PDF-friendly styles
      const cleanupStyles = this.applyPDFStyles(element);
      
      // Wait longer for styles to apply and content to render
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get element dimensions
      const rect = element.getBoundingClientRect();
      const elementWidth = rect.width;
      const elementHeight = rect.height;
      
      // Calculate scale to fit within maxWidth while maintaining aspect ratio
      const scale = Math.min(maxWidth / elementWidth, 1);
      const scaledWidth = elementWidth * scale;
      const scaledHeight = elementHeight * scale;

      // Check if we need a new page with more conservative margins
      const pageHeight = 280; // More conservative page height
      if (addPageIfNeeded && y + Math.max(scaledHeight, minHeight) > pageHeight - 30) {
        pdf.addPage();
        y = 20; // Reset to top of new page

      }
      
      // Capture the element with high quality settings and white background
      const canvas = await html2canvas(element, {
        backgroundColor: '#FFFFFF',
        scale: 2, // Balanced resolution
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging to debug issues
        width: elementWidth,
        height: elementHeight,
        windowWidth: Math.max(window.innerWidth, 1200),
        windowHeight: Math.max(window.innerHeight, 800),
        scrollX: 0,
        scrollY: 0,
        removeContainer: false,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Apply comprehensive styles to cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            
            /* Remove info icons completely */
            .lucide-info,
            svg[data-lucide="info"],
            .info-icon {
              display: none !important;
            }
            
            /* Ensure all text is visible */
            h1, h2, h3, h4, h5, h6, p, span, div, td, th {
              color: #111827 !important;
              opacity: 1 !important;
              visibility: visible !important;
            }
            
            /* Large numbers should be bold and dark */
            .text-4xl, .text-3xl, .text-2xl {
              color: #111827 !important;
              font-weight: bold !important;
              font-size: 2rem !important;
            }
            
            /* Progress bars */
            .bg-gradient-to-r {
              background: linear-gradient(to right, #8B5CF6, #A855F7) !important;
              height: 8px !important;
              border-radius: 4px !important;
            }
            
            /* Tables */
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            
            th, td {
              border: 1px solid #E5E7EB !important;
              padding: 8px !important;
              text-align: left !important;
            }
            
            th {
              background-color: #F3F4F6 !important;
              font-weight: bold !important;
            }
            
            /* Cards and containers */
            .bg-slate-800, .bg-slate-900, .bg-gradient-to-br {
              background-color: #FFFFFF !important;
              border: 1px solid #E5E7EB !important;
              border-radius: 8px !important;
            }
            
            .text-white, .text-gray-100 {
              color: #111827 !important;
            }
            .text-gray-400, .text-gray-500, .text-gray-600 {
              color: #374151 !important;
            }
            .text-cyan-400 {
              color: #0F172A !important;
              font-weight: bold !important;
            }
            .text-purple-400 {
              color: #0F172A !important;
              font-weight: bold !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
        ignoreElements: (element) => {
          // Skip problematic elements and info icons
          if (element.classList?.contains('lucide-info') || element.classList?.contains('info-icon')) return true;
          return element.classList?.contains('tooltip') || 
                 element.classList?.contains('dropdown') ||
                 element.style?.position === 'fixed';
        }
      });
      
      // Restore original styles
      cleanupStyles();
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // Add image to PDF
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      return y + Math.max(scaledHeight, minHeight) + 15; // Ensure minimum spacing
      
    } catch (error) {
      console.error('❌ Failed to capture element:', error);
      // Return next position even on error to continue with other sections
      return y + 50;
    }
  }

  /**
   * Internal method to create the Enhanced Visual Summary Report PDF object
   * This is the shared implementation used by both download and email methods
   */
  private async createEnhancedVisualSummaryReportPDF(projectName: string, userName: string, reportData: ReportData): Promise<jsPDF> {

    const pdf = new jsPDF('p', 'mm', 'a4');
      let currentY = 15;
      const pageWidth = 210;
      const margin = 12;
      const contentWidth = pageWidth - (margin * 2);

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(6, 182, 212);
      pdf.text('Test Run Summary Report', margin, currentY);
      currentY += 8;

      // Project name - full name displayed
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Project: ${projectName}`, margin, currentY, { maxWidth: contentWidth });
      currentY += 6;

      // Generated by info
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated by: ${userName}  |  ${new Date().toLocaleDateString()}`, margin, currentY);
      currentY += 12;

      // Helper function to draw a card with text wrapping
      const drawCard = (x: number, y: number, w: number, h: number, title: string, value: string, subtitle?: string) => {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, w, h, 2, 2, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, w, h, 2, 2, 'S');

        pdf.setFontSize(7);
        pdf.setTextColor(107, 114, 128);
        const titleLines = pdf.splitTextToSize(title, w - 4);
        pdf.text(titleLines, x + w/2, y + 5, { align: 'center' });

        const titleHeight = titleLines.length * 2.5;
        pdf.setFontSize(18);
        pdf.setTextColor(15, 23, 42);

        const valueLines = pdf.splitTextToSize(value, w - 4);
        pdf.text(valueLines, x + w/2, y + 8 + titleHeight, { align: 'center' });

        if (subtitle) {
          pdf.setFontSize(6);
          pdf.setTextColor(156, 163, 175);
          const subtitleLines = pdf.splitTextToSize(subtitle, w - 4);
          pdf.text(subtitleLines, x + w/2, y + h - 4, { align: 'center' });
        }
      };

      // Top row - 2 summary cards
      const cardHeight = 28;
      const cardWidth = (contentWidth - 3) / 2;

      drawCard(margin, currentY, cardWidth, cardHeight, 'Total Test Runs', reportData.totalTestRuns.toString(),
        `Active: ${reportData.activeTestRuns} | Closed: ${reportData.closedTestRuns}`);
      drawCard(margin + cardWidth + 3, currentY, cardWidth, cardHeight, 'Total Test Cases', reportData.totalTestCases.toString());

      currentY += cardHeight + 8;

      // Test Case Breakdown (Pie Chart) - Left side
      const chartCardWidth = (contentWidth - 4) / 2;
      const chartCardHeight = 75;

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, chartCardWidth, chartCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, chartCardWidth, chartCardHeight, 2, 2, 'S');

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Test Case Break-up', margin + 4, currentY + 6);

      if (reportData.testCaseBreakup) {
        const pieData = [
          { name: 'Passed', value: reportData.testCaseBreakup.passed || 0, color: '#10B981' },
          { name: 'Failed', value: reportData.testCaseBreakup.failed || 0, color: '#EF4444' },
          { name: 'Blocked', value: reportData.testCaseBreakup.blocked || 0, color: '#F59E0B' },
          { name: 'Retest', value: reportData.testCaseBreakup.retest || 0, color: '#F97316' },
          { name: 'Skipped', value: reportData.testCaseBreakup.skipped || 0, color: '#8B5CF6' },
          { name: 'Untested', value: reportData.testCaseBreakup.untested || 0, color: '#6B7280' },
          { name: 'In Progress', value: reportData.testCaseBreakup.inProgress || 0, color: '#3B82F6' },
          { name: 'System Issue', value: reportData.testCaseBreakup.unknown || 0, color: '#4B5563' }
        ].filter(item => item.value > 0);

        if (pieData.length > 0) {
          // Draw pie chart using triangular segments
          const centerX = margin + 22;
          const centerY = currentY + 42;
          const radius = 16;

          let startAngle = -Math.PI / 2; // Start at top (12 o'clock)
          const total = pieData.reduce((sum, item) => sum + item.value, 0);

          pieData.forEach((item) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            const rgb = [
              parseInt(item.color.slice(1, 3), 16),
              parseInt(item.color.slice(3, 5), 16),
              parseInt(item.color.slice(5, 7), 16)
            ];

            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);

            // Draw slice using multiple triangular segments for smooth arc
            const segments = Math.max(8, Math.ceil(sliceAngle / (Math.PI / 180) * 2)); // 2 segments per degree
            const segmentAngle = sliceAngle / segments;

            for (let i = 0; i < segments; i++) {
              const a1 = startAngle + (i * segmentAngle);
              const a2 = startAngle + ((i + 1) * segmentAngle);

              const x1 = centerX + radius * Math.cos(a1);
              const y1 = centerY + radius * Math.sin(a1);
              const x2 = centerX + radius * Math.cos(a2);
              const y2 = centerY + radius * Math.sin(a2);

              pdf.triangle(centerX, centerY, x1, y1, x2, y2, 'FD');
            }

            startAngle = endAngle;
          });

          // Draw white circle in center for donut effect
          pdf.setFillColor(255, 255, 255);
          pdf.setDrawColor(255, 255, 255);
          pdf.circle(centerX, centerY, 9, 'FD');

          // Center text
          pdf.setFontSize(14);
          pdf.setTextColor(15, 23, 42);
          pdf.text(reportData.totalTestCases.toString(), centerX, centerY, { align: 'center', baseline: 'middle' });
          pdf.setFontSize(6);
          pdf.setTextColor(107, 114, 128);
          pdf.text('Total', centerX, centerY + 4, { align: 'center' });

          // Legend
          const legendY = currentY + 22;
          pieData.forEach((item, index) => {
            const legendX = margin + 46;
            const rgb = [
              parseInt(item.color.slice(1, 3), 16),
              parseInt(item.color.slice(3, 5), 16),
              parseInt(item.color.slice(5, 7), 16)
            ];
            pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
            pdf.circle(legendX, legendY + (index * 7), 1.2, 'F');

            pdf.setFontSize(7);
            pdf.setTextColor(55, 65, 81);
            const percentage = Math.round((item.value / reportData.totalTestCases) * 100);
            pdf.text(`${item.name}: ${item.value} (${percentage}%)`, legendX + 3, legendY + (index * 7) + 0.8);
          });
        }
      }

      // Test Runs Breakdown (Bar Chart) - Right side
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin + chartCardWidth + 4, currentY, chartCardWidth, chartCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin + chartCardWidth + 4, currentY, chartCardWidth, chartCardHeight, 2, 2, 'S');

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Test Runs Break-up', margin + chartCardWidth + 8, currentY + 6);

      if (reportData.testRunsBreakup) {
        const barData = [
          { name: 'New', value: reportData.testRunsBreakup.new || 0 },
          { name: 'In Progress', value: reportData.testRunsBreakup.inProgress || 0 },
          { name: 'Under Review', value: reportData.testRunsBreakup.underReview || 0 },
          { name: 'Rejected', value: reportData.testRunsBreakup.rejected || 0 },
          { name: 'Done', value: reportData.testRunsBreakup.done || 0 },
          { name: 'Closed', value: reportData.testRunsBreakup.closed || 0 }
        ];

        // Draw bar chart manually for instant generation
        const chartX = margin + chartCardWidth + 8;
        const chartY = currentY + 15;
        const chartW = chartCardWidth - 16;
        const chartH = 50;
        const barSpacing = 2;
        const barWidth = (chartW - (barData.length - 1) * barSpacing) / barData.length;

        const maxValue = Math.max(...barData.map(d => d.value), 1);

        // Draw bars
        barData.forEach((item, index) => {
          const barHeight = (item.value / maxValue) * chartH;
          const x = chartX + (index * (barWidth + barSpacing));
          const y = chartY + chartH - barHeight;

          pdf.setFillColor(6, 182, 212); // cyan
          pdf.rect(x, y, barWidth, barHeight, 'F');

          // Value label
          pdf.setFontSize(6);
          pdf.setTextColor(15, 23, 42);
          pdf.text(item.value.toString(), x + barWidth / 2, y - 2, { align: 'center' });

          // X-axis label
          pdf.setFontSize(5);
          pdf.setTextColor(107, 114, 128);
          const labelLines = pdf.splitTextToSize(item.name, barWidth);
          pdf.text(labelLines, x + barWidth / 2, chartY + chartH + 3, { align: 'center' });
        });
      }

      currentY += chartCardHeight + 8;

      // Assignee Results - Full Width
      const assigneeCardHeight = 50;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, contentWidth, assigneeCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, contentWidth, assigneeCardHeight, 2, 2, 'S');

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Test Results across top 5 assignees', margin + 4, currentY + 6);

      if (reportData.assigneeResults && reportData.assigneeResults.length > 0) {
        let assigneeY = currentY + 14;
        const maxCount = Math.max(...reportData.assigneeResults.map((r) => r.count));

        reportData.assigneeResults.slice(0, 5).forEach((result, index: number) => {
          pdf.setFontSize(7);
          pdf.setTextColor(55, 65, 81);
          const nameText = `${index + 1}. ${result.assignee}`;
          pdf.text(nameText, margin + 5, assigneeY, { maxWidth: 50 });

          const barMaxWidth = contentWidth - 75;
          const barWidth = ((result.count / maxCount) * barMaxWidth);
          pdf.setFillColor(139, 92, 246);
          pdf.rect(margin + 58, assigneeY - 2.5, barWidth, 3, 'F');

          pdf.setFontSize(7);
          pdf.setTextColor(15, 23, 42);
          pdf.text(result.count.toString(), margin + 60 + barWidth, assigneeY);

          assigneeY += 8;
        });
      }

      currentY += assigneeCardHeight + 8;

      // Bottom 4 cards in 2x2 grid
      const statsCardHeight = 25;
      const statsCardWidth = (contentWidth - 4) / 2;

      // Row 1 - Defects and Requirements
      // Defects Linked with Test Results
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, statsCardWidth, statsCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, statsCardWidth, statsCardHeight, 2, 2, 'S');

      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Defects Linked with Test Results', margin + 4, currentY + 6);

      pdf.setFontSize(16);
      pdf.text(reportData.defectsLinkedWithTestResults?.toString() || '0', margin + 4, currentY + 16);

      // Requirements Linked with Test Runs
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin + statsCardWidth + 4, currentY, statsCardWidth, statsCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin + statsCardWidth + 4, currentY, statsCardWidth, statsCardHeight, 2, 2, 'S');

      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Requirements Linked with Test Runs', margin + statsCardWidth + 8, currentY + 6);

      pdf.setFontSize(16);
      pdf.text(reportData.requirementsLinkedWithTestRuns?.toString() || '0', margin + statsCardWidth + 8, currentY + 16);

      currentY += statsCardHeight + 4;

      // Row 2 - No Defects cards
      // No Defects by Priority
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, statsCardWidth, statsCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, statsCardWidth, statsCardHeight, 2, 2, 'S');

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('No Defects by Priority', margin + statsCardWidth / 2, currentY + 10, { align: 'center' });

      pdf.setFontSize(6);
      pdf.setTextColor(156, 163, 175);
      pdf.text('There are no defects available to show by priority.', margin + statsCardWidth / 2, currentY + 16, { align: 'center' });

      // No Defects by Status
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin + statsCardWidth + 4, currentY, statsCardWidth, statsCardHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin + statsCardWidth + 4, currentY, statsCardWidth, statsCardHeight, 2, 2, 'S');

      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text('No Defects by Status', margin + statsCardWidth + 4 + statsCardWidth / 2, currentY + 10, { align: 'center' });

      pdf.setFontSize(6);
      pdf.setTextColor(156, 163, 175);
      pdf.text('There are no defects available to show by status.', margin + statsCardWidth + 4 + statsCardWidth / 2, currentY + 16, { align: 'center' });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Generated by SMARTQA on ${new Date().toLocaleString()}`, margin, 290);

      return pdf;
  }

  /**
   * Generate Enhanced Visual Summary Report PDF and download it
   */
  async generateEnhancedVisualSummaryReportPDF(projectName: string, userName: string, reportData: ReportData): Promise<void> {
    try {
      const pdf = await this.createEnhancedVisualSummaryReportPDF(projectName, userName, reportData);

      const fileName = `test-run-summary-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('❌ Failed to generate enhanced PDF:', error);
      throw error;
    }
  }

  /**
   * Internal method to create the Detailed Report PDF object
   * This is the shared implementation used by both download and email methods
   */
  private async createDetailedReportPDF(reportData: ReportData, projectName: string, userName: string): Promise<jsPDF> {

    const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      const contentWidth = 170;
      let currentY = 20;

      // Title
      pdf.setFontSize(20);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Test Run Detailed Report', margin, currentY);
      currentY += 10;

      // Project and user info
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Project: ${projectName}`, margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`Generated by: ${userName}  |  ${new Date().toLocaleDateString()}`, margin, currentY);
      currentY += 12;

      // Performance Chart
      const chartCardWidth = (contentWidth - 4) / 2;
      const performanceChartHeight = 60;

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, chartCardWidth, performanceChartHeight, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, chartCardWidth, performanceChartHeight, 2, 2, 'S');

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text('Test run performance', margin + 4, currentY + 6);

      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${reportData.testCasesIncluded.length} Test Cases trend over Last 24 hours`, margin + 4, currentY + 11);

      // Draw stacked area chart manually
      if (reportData.performanceData && reportData.performanceData.length > 0) {
        const chartX = margin + 12;
        const chartY = currentY + 18;
        const chartW = chartCardWidth - 20;
        const chartH = 35;

        const data = reportData.performanceData;

        // Calculate total values (passed + failed + other) for each data point
        const dataWithTotals = data.map((d: ChartDataPoint) => ({
          ...d,
          total: ((d.passed as number) ?? 0) + ((d.failed as number) ?? 0) + ((d.other as number) ?? 0)
        }));

        const maxValue = Math.max(...dataWithTotals.map((d) => d.total), 1);
        const pointSpacing = data.length > 1 ? chartW / (data.length - 1) : 0;

        // Draw Y-axis labels
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        const yAxisSteps = 4;
        for (let i = 0; i <= yAxisSteps; i++) {
          const value = Math.round((maxValue * i) / yAxisSteps);
          const y = chartY + chartH - ((i / yAxisSteps) * chartH);
          pdf.text(value.toString(), chartX - 4, y + 1, { align: 'right' });
        }

        // Draw grid lines
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.1);
        for (let i = 0; i <= yAxisSteps; i++) {
          const y = chartY + chartH - ((i / yAxisSteps) * chartH);
          pdf.line(chartX, y, chartX + chartW, y);
        }

        // Draw three stacked area layers (passed, failed, other)
        if (data.length > 1) {
          // Calculate cumulative values for stacking (bottom to top: passed, failed, other)
          const baselineValues = new Array(data.length).fill(0);
          const passedValues = dataWithTotals.map((d) => (d.passed as number) ?? 0);
          const failedValues = dataWithTotals.map((d, i: number) => passedValues[i] + ((d.failed as number) ?? 0));
          const totalValues = dataWithTotals.map((d) => d.total);

          // Helper function to create smooth curved path using monotone cubic interpolation
          const drawSmoothFilledArea = (lowerValues: number[], upperValues: number[], fillR: number, fillG: number, fillB: number, strokeR: number, strokeG: number, strokeB: number) => {
            // Convert values to coordinates
            const upperPoints = upperValues.map((val, i) => ({
              x: chartX + (i * pointSpacing),
              y: chartY + chartH - ((val / maxValue) * chartH)
            }));
            const lowerPoints = lowerValues.map((val, i) => ({
              x: chartX + (i * pointSpacing),
              y: chartY + chartH - ((val / maxValue) * chartH)
            }));

            // Fill the area using approximation with small line segments
            pdf.setFillColor(fillR, fillG, fillB);

            // Create a closed path for filling
            const segments = 50; // number of curve segments between each data point for smoother curves

            for (let i = 0; i < data.length - 1; i++) {
              const p0Upper = i > 0 ? upperPoints[i - 1] : upperPoints[i];
              const p1Upper = upperPoints[i];
              const p2Upper = upperPoints[i + 1];
              const p3Upper = i < data.length - 2 ? upperPoints[i + 2] : upperPoints[i + 1];

              const p0Lower = i > 0 ? lowerPoints[i - 1] : lowerPoints[i];
              const p1Lower = lowerPoints[i];
              const p2Lower = lowerPoints[i + 1];
              const p3Lower = i < data.length - 2 ? lowerPoints[i + 2] : lowerPoints[i + 1];

              // Draw filled quads using Catmull-Rom spline approximation
              for (let seg = 0; seg < segments; seg++) {
                const t1 = seg / segments;
                const t2 = (seg + 1) / segments;

                // Calculate control points for Catmull-Rom spline
                const tension = 0.5;

                // Upper curve points
                const cpx1Upper = p1Upper.x + (p2Upper.x - p0Upper.x) * tension / 6;
                const cpy1Upper = p1Upper.y + (p2Upper.y - p0Upper.y) * tension / 6;
                const cpx2Upper = p2Upper.x - (p3Upper.x - p1Upper.x) * tension / 6;
                const cpy2Upper = p2Upper.y - (p3Upper.y - p1Upper.y) * tension / 6;

                // Lower curve points
                const cpx1Lower = p1Lower.x + (p2Lower.x - p0Lower.x) * tension / 6;
                const cpy1Lower = p1Lower.y + (p2Lower.y - p0Lower.y) * tension / 6;
                const cpx2Lower = p2Lower.x - (p3Lower.x - p1Lower.x) * tension / 6;
                const cpy2Lower = p2Lower.y - (p3Lower.y - p1Lower.y) * tension / 6;

                // Cubic Bezier interpolation
                const bezier = (t: number, p0: number, cp1: number, cp2: number, p1: number) => {
                  const u = 1 - t;
                  return u * u * u * p0 + 3 * u * u * t * cp1 + 3 * u * t * t * cp2 + t * t * t * p1;
                };

                const x1Upper = bezier(t1, p1Upper.x, cpx1Upper, cpx2Upper, p2Upper.x);
                const y1Upper = bezier(t1, p1Upper.y, cpy1Upper, cpy2Upper, p2Upper.y);
                const x2Upper = bezier(t2, p1Upper.x, cpx1Upper, cpx2Upper, p2Upper.x);
                const y2Upper = bezier(t2, p1Upper.y, cpy1Upper, cpy2Upper, p2Upper.y);

                const x1Lower = bezier(t1, p1Lower.x, cpx1Lower, cpx2Lower, p2Lower.x);
                const y1Lower = bezier(t1, p1Lower.y, cpy1Lower, cpy2Lower, p2Lower.y);
                const x2Lower = bezier(t2, p1Lower.x, cpx1Lower, cpx2Lower, p2Lower.x);
                const y2Lower = bezier(t2, p1Lower.y, cpy1Lower, cpy2Lower, p2Lower.y);

                // Clamp values to stay within chart bounds
                const chartBottom = chartY + chartH;
                const clampedY1Upper = Math.min(y1Upper, chartBottom);
                const clampedY2Upper = Math.min(y2Upper, chartBottom);
                const clampedY1Lower = Math.min(y1Lower, chartBottom);
                const clampedY2Lower = Math.min(y2Lower, chartBottom);

                if (isFinite(x1Upper) && isFinite(clampedY1Upper) && isFinite(x2Upper) && isFinite(clampedY2Upper) &&
                    isFinite(x1Lower) && isFinite(clampedY1Lower) && isFinite(x2Lower) && isFinite(clampedY2Lower)) {
                  pdf.triangle(x1Lower, clampedY1Lower, x2Lower, clampedY2Lower, x1Upper, clampedY1Upper, 'F');
                  pdf.triangle(x2Lower, clampedY2Lower, x2Upper, clampedY2Upper, x1Upper, clampedY1Upper, 'F');
                }
              }
            }

            // Draw smooth stroke line on top
            pdf.setDrawColor(strokeR, strokeG, strokeB);
            pdf.setLineWidth(0.4);

            for (let i = 0; i < data.length - 1; i++) {
              const p0 = i > 0 ? upperPoints[i - 1] : upperPoints[i];
              const p1 = upperPoints[i];
              const p2 = upperPoints[i + 1];
              const p3 = i < data.length - 2 ? upperPoints[i + 2] : upperPoints[i + 1];

              const tension = 0.5;
              const cpx1 = p1.x + (p2.x - p0.x) * tension / 6;
              const cpy1 = p1.y + (p2.y - p0.y) * tension / 6;
              const cpx2 = p2.x - (p3.x - p1.x) * tension / 6;
              const cpy2 = p2.y - (p3.y - p1.y) * tension / 6;

              const bezier = (t: number, p0: number, cp1: number, cp2: number, p1: number) => {
                const u = 1 - t;
                return u * u * u * p0 + 3 * u * u * t * cp1 + 3 * u * t * t * cp2 + t * t * t * p1;
              };

              for (let seg = 0; seg < segments; seg++) {
                const t1 = seg / segments;
                const t2 = (seg + 1) / segments;

                const x1 = bezier(t1, p1.x, cpx1, cpx2, p2.x);
                const y1 = bezier(t1, p1.y, cpy1, cpy2, p2.y);
                const x2 = bezier(t2, p1.x, cpx1, cpx2, p2.x);
                const y2 = bezier(t2, p1.y, cpy1, cpy2, p2.y);

                // Clamp stroke to stay within chart bounds
                const chartBottom = chartY + chartH;
                const clampedY1 = Math.min(y1, chartBottom);
                const clampedY2 = Math.min(y2, chartBottom);

                if (isFinite(x1) && isFinite(clampedY1) && isFinite(x2) && isFinite(clampedY2)) {
                  pdf.line(x1, clampedY1, x2, clampedY2);
                }
              }
            }
          };

          // 1. Draw "Passed" area (bottom - green)
          drawSmoothFilledArea(baselineValues, passedValues, 16, 185, 129, 5, 150, 105); // green-500 fill, green-600 stroke

          // 2. Draw "Failed" area (middle - red)
          drawSmoothFilledArea(passedValues, failedValues, 239, 68, 68, 220, 38, 38); // red-500 fill, red-600 stroke

          // 3. Draw "Other" area (top - amber/yellow)
          drawSmoothFilledArea(failedValues, totalValues, 251, 191, 36, 245, 158, 11); // amber-400 fill, amber-500 stroke
        }

        // Draw x-axis labels with smart spacing to prevent overlap
        pdf.setFontSize(5);
        pdf.setTextColor(107, 114, 128);

        // Calculate how many labels we can fit without overlapping
        const minLabelSpacing = 8; // Minimum mm between labels
        const maxLabels = Math.floor(chartW / minLabelSpacing);
        const labelInterval = Math.max(1, Math.ceil(data.length / maxLabels));

        data.forEach((point: ChartDataPoint, index: number) => {
          const x = data.length > 1 ? chartX + (index * pointSpacing) : chartX + chartW / 2;

          // Only draw label if x is valid, we have a date, and it's at the right interval
          if (isFinite(x) && point.date && index % labelInterval === 0) {
            pdf.text(point.date, x, chartY + chartH + 4, { align: 'center' });
          }
        });

        // Draw legend below the chart
        const legendY = chartY + chartH + 10;
        const legendItemWidth = 25;
        const legendStartX = chartX + (chartW / 2) - (legendItemWidth * 1.5);

        // Legend: Passed
        pdf.setFillColor(16, 185, 129); // green-500
        pdf.rect(legendStartX, legendY, 3, 3, 'F');
        pdf.setFontSize(6);
        pdf.setTextColor(75, 85, 99);
        pdf.text('Passed', legendStartX + 5, legendY + 2.5);

        // Legend: Failed
        pdf.setFillColor(239, 68, 68); // red-500
        pdf.rect(legendStartX + legendItemWidth, legendY, 3, 3, 'F');
        pdf.text('Failed', legendStartX + legendItemWidth + 5, legendY + 2.5);

        // Legend: Other Results
        pdf.setFillColor(251, 191, 36); // amber-400
        pdf.rect(legendStartX + legendItemWidth * 2, legendY, 3, 3, 'F');
        pdf.text('Other Results', legendStartX + legendItemWidth * 2 + 5, legendY + 2.5);
      }

      // Summary Cards - 2x2 grid on the right
      const summaryCardWidth = (chartCardWidth - 2) / 2;
      const summaryCardHeight = 28;
      const summaryStartX = margin + chartCardWidth + 4;

      const drawSummaryCard = (x: number, y: number, title: string, value: string, color: string) => {
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, summaryCardWidth, summaryCardHeight, 2, 2, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, summaryCardWidth, summaryCardHeight, 2, 2, 'S');

        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(title, x + summaryCardWidth / 2, y + 8, { align: 'center' });

        pdf.setFontSize(16);
        const [r, g, b] = color.split(',').map(Number);
        pdf.setTextColor(r, g, b);
        pdf.text(value, x + summaryCardWidth / 2, y + 18, { align: 'center' });
      };

      drawSummaryCard(summaryStartX, currentY, 'Active Test Runs',
        `${reportData.activeTestRuns}/${reportData.totalTestRuns}`, '6,182,212');
      drawSummaryCard(summaryStartX + summaryCardWidth + 2, currentY, 'Closed Test Runs',
        `${reportData.closedTestRuns}/${reportData.totalTestRuns}`, '168,85,247');
      drawSummaryCard(summaryStartX, currentY + summaryCardHeight + 2, 'Total Test Cases',
        reportData.totalTestCases.toString(), '34,197,94');

      currentY += performanceChartHeight + 10;

      // Test Cases Table
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, currentY, contentWidth, 10, 2, 2, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, currentY, contentWidth, 10, 2, 2, 'S');

      pdf.setFontSize(10);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${reportData.testCasesIncluded.length} Test cases included in this report`, margin + 4, currentY + 6);

      currentY += 12;

      // Table headers
      const colWidths = [35, 50, 30, 25, 30];
      const headers = ['TEST RUN', 'TEST CASE', 'LATEST STATUS', 'PRIORITY', 'ASSIGNEE'];

      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, currentY, contentWidth, 8, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(margin, currentY, contentWidth, 8, 'S');

      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      let colX = margin + 2;
      headers.forEach((header, i) => {
        pdf.text(header, colX, currentY + 5);
        colX += colWidths[i];
      });

      currentY += 8;

      // Table rows - show up to 15 test cases
      const maxRows = 15;
      const rowHeight = 12;
      const testCases = reportData.testCasesIncluded.slice(0, maxRows);

      testCases.forEach((tc: Record<string, unknown>, index: number) => {
        if (currentY + rowHeight > 280) {
          pdf.addPage();
          currentY = 20;

          // Redraw headers on new page
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, currentY, contentWidth, 8, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.rect(margin, currentY, contentWidth, 8, 'S');

          pdf.setFontSize(7);
          pdf.setTextColor(107, 114, 128);
          colX = margin + 2;
          headers.forEach((header, i) => {
            pdf.text(header, colX, currentY + 5);
            colX += colWidths[i];
          });

          currentY += 8;
        }

        // Alternating row colors
        pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
        pdf.rect(margin, currentY, contentWidth, rowHeight, 'F');
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(margin, currentY, contentWidth, rowHeight, 'S');

        pdf.setFontSize(6);
        pdf.setTextColor(15, 23, 42);

        // Test Run
        colX = margin + 2;
        pdf.text(`TR-${tc.testRunId}`, colX, currentY + 4, { maxWidth: colWidths[0] - 4 });
        pdf.setFontSize(5);
        pdf.setTextColor(107, 114, 128);
        pdf.text(tc.testRunName, colX, currentY + 7, { maxWidth: colWidths[0] - 4 });

        // Test Case
        colX += colWidths[0];
        pdf.setFontSize(6);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`TC-${tc.testCaseProjectRelativeId || tc.testCaseId}`, colX, currentY + 4, { maxWidth: colWidths[1] - 4 });
        pdf.setFontSize(5);
        pdf.setTextColor(107, 114, 128);
        pdf.text(tc.testCaseTitle, colX, currentY + 7, { maxWidth: colWidths[1] - 4 });

        // Latest Status
        colX += colWidths[1];
        pdf.setFontSize(6);
        pdf.setTextColor(15, 23, 42);
        pdf.text(tc.latestStatus, colX, currentY + 6, { maxWidth: colWidths[2] - 4 });

        // Priority
        colX += colWidths[2];
        pdf.text(tc.priority, colX, currentY + 6, { maxWidth: colWidths[3] - 4 });

        // Assignee
        colX += colWidths[3];
        pdf.text(tc.assignee, colX, currentY + 6, { maxWidth: colWidths[4] - 4 });

        currentY += rowHeight;
      });

      // Footer
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.text(`Generated by SMARTQA on ${new Date().toLocaleString()}`, margin, 285);
        pdf.text(`Page ${i} of ${pageCount}`, contentWidth + margin - 20, 285);
      }

      return pdf;
  }

  /**
   * Generate Detailed Report PDF and download it
   */
  async generateDetailedReportPDF(reportData: ReportData, projectName: string, userName: string): Promise<void> {
    try {
      const pdf = await this.createDetailedReportPDF(reportData, projectName, userName);

      const fileName = `test-run-detailed-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('❌ Failed to generate detailed report PDF:', error);
      throw error;
    }
  }

  /**
   * Generate complete visual PDF for Test Run Summary Report
   */
  async generateVisualSummaryReportPDF(projectName: string, userName: string): Promise<void> {
    try {

      // Wait for all elements to render completely
      await this.waitForElementsToRender();
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let currentY = 20;
      // const pageWidth = 210; // A4 width in mm
      const contentWidth = 160; // Reduced content width for better margins

      // Header with better styling for PDF
      pdf.setFontSize(28);
      pdf.setTextColor(6, 182, 212); // cyan-400
      pdf.text('Test Run Summary Report', 20, currentY);
      currentY += 20;

      // Project and user info with better contrast
      pdf.setFontSize(14);
      pdf.setTextColor(31, 41, 59); // slate-800 for better readability
      pdf.text(`Project: ${projectName}`, 20, currentY);
      currentY += 8;
      pdf.text(`Generated by: ${userName}`, 20, currentY);
      currentY += 8;
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, currentY);
      currentY += 20;

      // Define all sections to capture in order
      const reportSections = [
        {
          selector: '[data-report-section="summary-cards"]',
          title: 'Summary Metrics',
          description: 'Overview of test runs and test cases'
        },
        {
          selector: '[data-report-section="pie-chart"]',
          title: 'Test Case Breakdown',
          description: 'Distribution of test case results'
        },
        {
          selector: '[data-report-section="bar-chart"]',
          title: 'Test Runs Breakdown',
          description: 'Test runs by status'
        },
        {
          selector: '[data-report-section="assignee-results"]',
          title: 'Top 5 Assignees',
          description: 'Test results by assignee'
        },
        {
          selector: '[data-report-section="defects-section"]',
          title: 'Defects Analysis',
          description: 'Defects linked with test results'
        },
        {
          selector: '[data-report-section="requirements-section"]',
          title: 'Requirements Analysis',
          description: 'Requirements linked with test runs'
        }
      ];

      // Capture each section
      for (let i = 0; i < reportSections.length; i++) {
        const section = reportSections[i];

        const element = document.querySelector(section.selector) as HTMLElement;
        if (element) {
          // Check if we need a new page for the section
          if (currentY > 220) {
            pdf.addPage();
            currentY = 20;
          }
          
          // Add section title with better styling
          pdf.setFontSize(16);
          pdf.setTextColor(15, 23, 42); // slate-900 for maximum contrast
          pdf.text(section.title, 20, currentY);
          currentY += 12;
          
          // Add description with medium contrast
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105); // slate-600 for good readability
          pdf.text(section.description, 20, currentY);
          currentY += 10;
          
          // Capture the element with improved styling
          currentY = await this.captureElementAsImage(
            element, 
            pdf, 
            20, 
            currentY, 
            contentWidth,
            true,
            40 // Minimum height to ensure content isn't too small
          );
          
          currentY += 10; // Spacing between sections
        } else {
          console.warn(`⚠️ Section not found: ${section.selector}`);
          
          // Add placeholder text with good contrast
          pdf.setFontSize(12);
          pdf.setTextColor(107, 114, 128); // gray-500
          pdf.text(`${section.title}: Data not available`, 20, currentY);
          currentY += 15;
        }
      }

      // Add footer with good contrast
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(`Generated by SMARTQA on ${new Date().toLocaleString()}`, 20, 270);

      // Download the PDF
      const fileName = `test-run-summary-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('❌ Failed to generate complete visual PDF:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate complete visual PDF for Test Run Detailed Report
   */
  async generateVisualDetailedReportPDF(projectName: string, userName: string): Promise<void> {
    try {

      // Wait for all elements to render completely
      await this.waitForElementsToRender();
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      let currentY = 20;
      const contentWidth = 160;

      // Header with better styling for PDF
      pdf.setFontSize(28);
      pdf.setTextColor(6, 182, 212); // cyan-400
      pdf.text('Test Run Detailed Report', 20, currentY);
      currentY += 20;

      // Project and user info with better contrast
      pdf.setFontSize(14);
      pdf.setTextColor(31, 41, 59); // slate-800 for better readability
      pdf.text(`Project: ${projectName}`, 20, currentY);
      currentY += 8;
      pdf.text(`Generated by: ${userName}`, 20, currentY);
      currentY += 8;
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, currentY);
      currentY += 20;

      // Define all sections for detailed report
      const reportSections = [
        {
          selector: '[data-report-section="performance-chart"]',
          title: 'Test Run Performance',
          description: 'Performance trend over time'
        },
        {
          selector: '[data-report-section="summary-cards-grid"]',
          title: 'Summary Metrics',
          description: 'Key performance indicators'
        },
        {
          selector: '[data-report-section="test-cases-table"]',
          title: 'Test Cases Included',
          description: 'Detailed list of all test cases in the report'
        }
      ];

      // Capture each section
      for (let i = 0; i < reportSections.length; i++) {
        const section = reportSections[i];

        const element = document.querySelector(section.selector) as HTMLElement;
        if (element) {
          // Check if we need a new page for the section
          if (currentY > 220) {
            pdf.addPage();
            currentY = 20;
          }
          
          // Add section title with better styling
          pdf.setFontSize(16);
          pdf.setTextColor(15, 23, 42); // slate-900 for maximum contrast
          pdf.text(section.title, 20, currentY);
          currentY += 12;
          
          // Add description with medium contrast
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105); // slate-600 for good readability
          pdf.text(section.description, 20, currentY);
          currentY += 10;
          
          // Capture the element with improved styling
          currentY = await this.captureElementAsImage(
            element, 
            pdf, 
            20, 
            currentY, 
            contentWidth,
            true,
            40 // Minimum height
          );
          
          currentY += 10; // Spacing between sections
        } else {
          console.warn(`⚠️ Detailed section not found: ${section.selector}`);
          
          // Add placeholder text with good contrast
          pdf.setFontSize(12);
          pdf.setTextColor(107, 114, 128); // gray-500
          pdf.text(`${section.title}: Data not available`, 20, currentY);
          currentY += 15;
        }
      }

      // Add footer with good contrast
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // gray-500
      pdf.text(`Generated by SMARTQA on ${new Date().toLocaleString()}`, 20, 270);

      // Download the PDF
      const fileName = `test-run-detailed-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('❌ Failed to generate complete detailed visual PDF:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Internal method to create the Summary Report CSV content
   * This is the shared implementation used by both download and email methods
   */
  private createSummaryReportCSV(reportData: ReportData, projectName: string, userName: string): string {

    // Use array buffer for faster string concatenation
    const rows: string[] = [];
    const addRow = (...cells: string[]) => {
      rows.push(cells.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','));
    };

      // Header Section
      addRow('Test Run Summary Report');
      addRow('Project:', projectName);
      addRow('Generated By:', userName);
      addRow('Generated On:', new Date().toLocaleString());
      addRow('');

      // Summary Metrics Section
      addRow('=== SUMMARY METRICS ===');
      addRow('Metric', 'Value');
      addRow('Total Test Runs', reportData.totalTestRuns.toString());
      addRow('Active Test Runs', reportData.activeTestRuns.toString());
      addRow('Closed Test Runs', reportData.closedTestRuns.toString());
      addRow('Total Test Cases', reportData.totalTestCases.toString());
      addRow('');

      // Test Case Breakdown Section
      addRow('=== TEST CASE BREAKDOWN ===');
      addRow('Status', 'Count', 'Percentage', 'Visual');

      const totalTC = reportData.totalTestCases || 1;
      const addTestCaseRow = (status: string, count: number) => {
        const pct = Math.round((count / totalTC) * 100);
        const visual = '█'.repeat(Math.floor(pct / 2));
        addRow(status, count.toString(), `${pct}%`, visual);
      };

      addTestCaseRow('Passed', reportData.testCaseBreakup.passed);
      addTestCaseRow('Failed', reportData.testCaseBreakup.failed);
      addTestCaseRow('Blocked', reportData.testCaseBreakup.blocked);
      addTestCaseRow('Retest', reportData.testCaseBreakup.retest);
      addTestCaseRow('Skipped', reportData.testCaseBreakup.skipped);
      addTestCaseRow('Untested', reportData.testCaseBreakup.untested);
      addTestCaseRow('In Progress', reportData.testCaseBreakup.inProgress);
      addTestCaseRow('System Issue', reportData.testCaseBreakup.unknown);
      addRow('');

      // Test Runs Breakdown Section
      addRow('=== TEST RUNS BREAKDOWN ===');
      addRow('State', 'Count', 'Percentage');

      const totalTR = reportData.totalTestRuns || 1;
      const addTestRunRow = (state: string, count: number) => {
        const pct = Math.round((count / totalTR) * 100);
        addRow(state, count.toString(), `${pct}%`);
      };

      addTestRunRow('New', reportData.testRunsBreakup.new);
      addTestRunRow('In Progress', reportData.testRunsBreakup.inProgress);
      addTestRunRow('Under Review', reportData.testRunsBreakup.underReview);
      addTestRunRow('Rejected', reportData.testRunsBreakup.rejected);
      addTestRunRow('Done', reportData.testRunsBreakup.done);
      addTestRunRow('Closed', reportData.testRunsBreakup.closed);
      addRow('');

      // Top Assignees Section
      addRow('=== TOP ASSIGNEES ===');
      addRow('Rank', 'Assignee', 'Test Cases Count', 'Percentage');

      const maxAssigneeCount = Math.max(...reportData.assigneeResults.map(r => r.count), 1);
      reportData.assigneeResults.forEach((result, index) => {
        const pct = Math.round((result.count / maxAssigneeCount) * 100);
        addRow(
          `#${index + 1}`,
          result.assignee,
          result.count.toString(),
          `${pct}%`
        );
      });
      addRow('');

      // Additional Metrics Section
      addRow('=== ADDITIONAL METRICS ===');
      addRow('Metric', 'Value');
      addRow('Defects Linked with Test Results', (reportData.defectsLinkedWithTestResults || 0).toString());
      addRow('Requirements Linked with Test Runs', (reportData.requirementsLinkedWithTestRuns || 0).toString());
      addRow('');

      // Summary Statistics
      addRow('=== SUMMARY STATISTICS ===');
      const passRate = totalTC > 0 ? Math.round((reportData.testCaseBreakup.passed / totalTC) * 100) : 0;
      const failRate = totalTC > 0 ? Math.round((reportData.testCaseBreakup.failed / totalTC) * 100) : 0;
      const coverageRate = totalTC > 0 ? Math.round(((totalTC - reportData.testCaseBreakup.untested) / totalTC) * 100) : 0;

      addRow('Pass Rate', `${passRate}%`);
      addRow('Fail Rate', `${failRate}%`);
      addRow('Test Coverage', `${coverageRate}%`);
      addRow('Active vs Closed Ratio', `${reportData.activeTestRuns}:${reportData.closedTestRuns}`);

      // Return CSV content with BOM
      return '\uFEFF' + rows.join('\n');
  }

  /**
   * Generate comprehensive CSV for Test Run Summary Report and download it
   */
  generateSummaryReportCSV(reportData: ReportData, projectName: string, userName: string): void {
    try {
      const csvContent = this.createSummaryReportCSV(reportData, projectName, userName);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `test-run-summary-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Failed to generate CSV:', error);
      throw error;
    }
  }

  /**
   * Internal method to create the Detailed Report CSV content
   * This is the shared implementation used by both download and email methods
   */
  private createDetailedReportCSV(reportData: DetailedReportData, projectName: string, userName: string): string {

    // Use array buffer for faster string concatenation
    const rows: string[] = [];
    const addRow = (...cells: string[]) => {
      rows.push(cells.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','));
    };

      // Header Section
      addRow('Test Run Detailed Report');
      addRow('Project:', projectName);
      addRow('Generated By:', userName);
      addRow('Generated On:', new Date().toLocaleString());
      addRow('');

      // Summary Metrics Section
      addRow('=== SUMMARY METRICS ===');
      addRow('Metric', 'Value');
      addRow('Total Test Runs', reportData.totalTestRuns.toString());
      addRow('Active Test Runs', reportData.activeTestRuns.toString());
      addRow('Closed Test Runs', reportData.closedTestRuns.toString());
      addRow('Total Test Cases', reportData.totalTestCases.toString());
      addRow('');

      // Performance Trends Section
      addRow('=== TEST RESULTS TRENDS (Last 7 Days) ===');
      addRow('Date', 'Passed', 'Failed', 'Other', 'Total', 'Pass Rate');

      reportData.performanceData.forEach(data => {
        const total = (data.passed || 0) + (data.failed || 0) + (data.other || 0);
        const passRate = total > 0 ? Math.round((data.passed / total) * 100) : 0;
        addRow(
          data.date,
          (data.passed || 0).toString(),
          (data.failed || 0).toString(),
          (data.other || 0).toString(),
          total.toString(),
          `${passRate}%`
        );
      });
      addRow('');

      // Test Case Breakdown Section
      addRow('=== TEST CASE BREAKDOWN ===');
      addRow('Status', 'Count', 'Percentage', 'Visual');

      const totalTC = reportData.totalTestCases || 1;
      const addTestCaseRow = (status: string, count: number) => {
        const pct = Math.round((count / totalTC) * 100);
        const visual = '█'.repeat(Math.floor(pct / 2));
        addRow(status, count.toString(), `${pct}%`, visual);
      };

      addTestCaseRow('Passed', reportData.testCaseBreakup.passed);
      addTestCaseRow('Failed', reportData.testCaseBreakup.failed);
      addTestCaseRow('Blocked', reportData.testCaseBreakup.blocked);
      addTestCaseRow('Untested', reportData.testCaseBreakup.untested);
      addRow('');

      // Test Runs Breakdown Section
      addRow('=== TEST RUNS BREAKDOWN ===');
      addRow('State', 'Count', 'Percentage');

      const totalTR = reportData.totalTestRuns || 1;
      const addTestRunRow = (state: string, count: number) => {
        const pct = Math.round((count / totalTR) * 100);
        addRow(state, count.toString(), `${pct}%`);
      };

      addTestRunRow('New', reportData.testRunsBreakup.new);
      addTestRunRow('In Progress', reportData.testRunsBreakup.inProgress);
      addTestRunRow('Under Review', reportData.testRunsBreakup.underReview);
      addTestRunRow('Rejected', reportData.testRunsBreakup.rejected);
      addTestRunRow('Done', reportData.testRunsBreakup.done);
      addTestRunRow('Closed', reportData.testRunsBreakup.closed);
      addRow('');

      // Top Assignees Section
      addRow('=== TOP ASSIGNEES ===');
      addRow('Rank', 'Assignee', 'Test Cases Count', 'Percentage');

      const maxAssigneeCount = Math.max(...reportData.assigneeResults.map(r => r.count), 1);
      reportData.assigneeResults.forEach((result, index) => {
        const pct = Math.round((result.count / maxAssigneeCount) * 100);
        addRow(
          `#${index + 1}`,
          result.assignee,
          result.count.toString(),
          `${pct}%`
        );
      });
      addRow('');

      // Test Cases Included Section (Main Data)
      addRow('=== TEST CASES INCLUDED IN REPORT ===');
      addRow(
        'Test Run ID',
        'Test Run Name',
        'Test Run Status',
        'Test Case ID',
        'Test Case Title',
        'Latest Status',
        'Priority',
        'Assignee'
      );

      reportData.testCasesIncluded.forEach(tc => {
        addRow(
          `TR-${tc.testRunId}`,
          tc.testRunName,
          tc.testRunStatus,
          `TC-${tc.testCaseProjectRelativeId || tc.testCaseId}`,
          tc.testCaseTitle,
          tc.latestStatus,
          tc.priority,
          tc.assignee
        );
      });
      addRow('');

      // Status Distribution by Priority
      addRow('=== STATUS DISTRIBUTION BY PRIORITY ===');
      const priorityGroups = new Map<string, { passed: number; failed: number; blocked: number; untested: number; total: number }>();

      reportData.testCasesIncluded.forEach(tc => {
        if (!priorityGroups.has(tc.priority)) {
          priorityGroups.set(tc.priority, { passed: 0, failed: 0, blocked: 0, untested: 0, total: 0 });
        }
        const group = priorityGroups.get(tc.priority)!;
        group.total++;

        const status = tc.latestStatus.toLowerCase();
        if (status === 'passed') group.passed++;
        else if (status === 'failed') group.failed++;
        else if (status === 'blocked') group.blocked++;
        else group.untested++;
      });

      addRow('Priority', 'Total', 'Passed', 'Failed', 'Blocked', 'Untested', 'Pass Rate');
      Array.from(priorityGroups.entries())
        .sort((a, b) => {
          const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
          return (priorityOrder[a[0] as keyof typeof priorityOrder] || 99) - (priorityOrder[b[0] as keyof typeof priorityOrder] || 99);
        })
        .forEach(([priority, stats]) => {
          const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
          addRow(
            priority,
            stats.total.toString(),
            stats.passed.toString(),
            stats.failed.toString(),
            stats.blocked.toString(),
            stats.untested.toString(),
            `${passRate}%`
          );
        });
      addRow('');

      // Summary Statistics
      addRow('=== SUMMARY STATISTICS ===');
      const passRate = totalTC > 0 ? Math.round((reportData.testCaseBreakup.passed / totalTC) * 100) : 0;
      const failRate = totalTC > 0 ? Math.round((reportData.testCaseBreakup.failed / totalTC) * 100) : 0;
      const coverageRate = totalTC > 0 ? Math.round(((totalTC - reportData.testCaseBreakup.untested) / totalTC) * 100) : 0;
      const avgTestCasesPerRun = totalTR > 0 ? Math.round(totalTC / totalTR) : 0;

      addRow('Pass Rate', `${passRate}%`);
      addRow('Fail Rate', `${failRate}%`);
      addRow('Test Coverage', `${coverageRate}%`);
      addRow('Active vs Closed Ratio', `${reportData.activeTestRuns}:${reportData.closedTestRuns}`);
      addRow('Avg Test Cases per Run', avgTestCasesPerRun.toString());
      addRow('Total Test Cases Included', reportData.testCasesIncluded.length.toString());

      // Return CSV content with BOM
      return '\uFEFF' + rows.join('\n');
  }

  /**
   * Generate comprehensive CSV for Test Run Detailed Report and download it
   */
  generateDetailedReportCSV(reportData: DetailedReportData, projectName: string, userName: string): void {
    try {
      const csvContent = this.createDetailedReportCSV(reportData, projectName, userName);

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `test-run-detailed-${projectName.replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Failed to generate detailed CSV:', error);
      throw error;
    }
  }

  /**
   * Generate Summary Report PDF as Blob (for email attachment)
   * Uses the EXACT same implementation as the download version
   */
  async generateSummaryReportPDFBlob(projectName: string, userName: string, reportData: ReportData): Promise<Blob> {
    try {

      const pdf = await this.createEnhancedVisualSummaryReportPDF(projectName, userName, reportData);
      return pdf.output('blob');
    } catch (error) {
      console.error('❌ Failed to generate summary PDF blob:', error);
      throw error;
    }
  }

  /**
   * Generate Detailed Report PDF as Blob (for email attachment)
   * Uses the EXACT same implementation as the download version
   */
  async generateDetailedReportPDFBlob(reportData: ReportData, projectName: string, userName: string): Promise<Blob> {
    try {

      const pdf = await this.createDetailedReportPDF(reportData, projectName, userName);
      return pdf.output('blob');
    } catch (error) {
      console.error('❌ Failed to generate detailed PDF blob:', error);
      throw error;
    }
  }

  /**
   * Generate Summary Report CSV as Blob (for email attachment)
   * Uses the EXACT same implementation as the download version
   */
  generateSummaryReportCSVBlob(reportData: ReportData, projectName: string, userName: string): Blob {
    const csvContent = this.createSummaryReportCSV(reportData, projectName, userName);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Generate Detailed Report CSV as Blob (for email attachment)
   * Uses the EXACT same implementation as the download version
   */
  generateDetailedReportCSVBlob(reportData: DetailedReportData, projectName: string, userName: string): Blob {
    const csvContent = this.createDetailedReportCSV(reportData, projectName, userName);
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }
}

export const reportDownloadService = new ReportDownloadService();

export interface ReportData {
  totalTestRuns: number;
  activeTestRuns: number;
  closedTestRuns: number;
  totalTestCases: number;
  testCaseBreakup: {
    passed: number;
    failed: number;
    blocked: number;
    retest: number;
    skipped: number;
    untested: number;
    inProgress: number;
    unknown: number;
  };
  testRunsBreakup: {
    new: number;
    inProgress: number;
    underReview: number;
    rejected: number;
    done: number;
    closed: number;
  };
  assigneeResults: Array<{
    assignee: string;
    count: number;
  }>;
  defectsLinkedWithTestResults?: number;
  requirementsLinkedWithTestRuns?: number;
}

export interface DetailedReportData extends ReportData {
  testCasesIncluded: Array<{
    testRunId: string;
    testRunName: string;
    testRunStatus: string;
    testCaseId: string;
    testCaseProjectRelativeId?: number;
    testCaseTitle: string;
    latestStatus: string;
    priority: string;
    assignee: string;
    configurationId?: string | null;
    configurationName?: string | null;
  }>;
  performanceData: Array<{
    date: string;
    passed: number;
    failed: number;
    other: number;
  }>;
}