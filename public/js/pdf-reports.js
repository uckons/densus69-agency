/* Direct, vector PDF reports. Libraries are served locally; no print dialog or CDN. */
(() => {
    const palette = { ink: '#142337', muted: '#64748B', gold: '#C59B52', light: '#F3F6FA', line: '#DEE5EE' };
    const money = value => 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    const date = value => {
        if (!value) return '-';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
    };
    const text = value => String(value ?? '-').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);

    function chartImages(configurations) {
        if (typeof window.Chart !== 'function') throw new Error('Grafik belum termuat. Refresh halaman dan coba lagi.');
        return configurations.map(({ title, type, data, horizontal = false }) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 600;
            let chart;
            try {
                chart = new window.Chart(canvas, {
                    type,
                    data: structuredClone(data),
                    options: {
                        responsive: false, animation: false, devicePixelRatio: 1,
                        ...(horizontal ? { indexAxis: 'y' } : {}),
                        font: { family: 'Arial', size: 22 },
                        plugins: { legend: { position: 'bottom', labels: { font: { size: 22 }, padding: 20 } } },
                        ...(type === 'doughnut' ? {} : { scales: {
                            x: { ticks: { font: { size: 20 }, maxRotation: 35 } },
                            y: { beginAtZero: true, ticks: { font: { size: 20 } } }
                        } })
                    }
                });
                // Composite onto white so transparent charts render consistently in PDF viewers.
                const background = document.createElement('canvas');
                background.width = canvas.width;
                background.height = canvas.height;
                const context = background.getContext('2d');
                context.fillStyle = '#FFFFFF';
                context.fillRect(0, 0, background.width, background.height);
                context.drawImage(canvas, 0, 0);
                return { title, image: background.toDataURL('image/png'), aspect: canvas.width / canvas.height };
            } finally {
                chart?.destroy();
            }
        });
    }

    function createReport(options) {
        if (!window.jspdf?.jsPDF) throw new Error('PDF belum termuat. Refresh halaman dan coba lagi.');
        const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
        if (typeof doc.autoTable !== 'function') throw new Error('Komponen tabel PDF belum termuat.');
        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();
        const margin = 14;
        const usable = width - margin * 2;
        const now = new Date();
        const stamp = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replace(/\D/g, '');
        const reference = options.reference || `${options.prefix}-${stamp}-${now.getTime().toString(36).toUpperCase()}`;
        const generated = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
        doc.setProperties({ title: `${options.title} | Sky Agency`, subject: reference, author: 'Sky Agency', creator: 'Sky Agency Reporting' });

        function label(value, x, y, size = 8, color = palette.muted, bold = false, extra = {}) {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(size);
            doc.setTextColor(color);
            doc.text(Array.isArray(value) ? value.map(text) : text(value), x, y, extra);
        }
        function fit(value, x, y, maxWidth, size, color, bold = false, maxLines = 2) {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(size);
            const lines = doc.splitTextToSize(text(value), maxWidth);
            const visible = lines.slice(0, maxLines);
            if (lines.length > maxLines) visible[maxLines - 1] = visible[maxLines - 1].replace(/.{3}$/, '...');
            label(visible, x, y, size, color, bold);
        }
        function header() {
            doc.setFillColor(palette.ink);
            doc.rect(0, 0, width, 54, 'F');
            doc.setFillColor(palette.gold);
            doc.rect(0, 54, width, 1.2, 'F');
            doc.roundedRect(margin, 12, 12, 12, 2, 2, 'F');
            label('SA', margin + 6, 20, 11, palette.ink, true, { align: 'center' });
            label('SKY AGENCY', margin + 17, 17, 17, '#FFFFFF', true);
            label('FINANCE & BUSINESS REPORTING', margin + 17, 23, 6.5, '#C8D3E0');
            label(options.title, margin, 37, 18, '#FFFFFF', true);
            label('agency.densus69.my.id  /  info@densus69.my.id', margin, 46, 8, '#C8D3E0');
            label(reference, width - margin, 15, 7, '#FFFFFF', true, { align: 'right' });
            label(generated, width - margin, 21, 7, '#C8D3E0', false, { align: 'right' });
        }
        let y = 65;
        const metrics = options.metrics || [];
        if (metrics.length) {
            const metricColumns = Math.min(3, metrics.length);
            const cardWidth = (usable - (metricColumns - 1) * 3) / metricColumns;
            metrics.forEach(([name, value], i) => {
                const x = margin + (i % metricColumns) * (cardWidth + 3);
                const cardY = y + Math.floor(i / metricColumns) * 31;
                doc.setFillColor(palette.light);
                doc.roundedRect(x, cardY, cardWidth, 27, 2, 2, 'F');
                doc.setFillColor(palette.gold);
                doc.rect(x + 3, cardY + 5, 1, 16, 'F');
                fit(name.toUpperCase(), x + 7, cardY + 8, cardWidth - 11, 6.5, palette.muted, true, 1);
                fit(value, x + 7, cardY + 17, cardWidth - 11, 10, palette.ink, true, 2);
            });
            y += Math.ceil(metrics.length / metricColumns) * 31 + 5;
        }
        if (options.context) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const lines = doc.splitTextToSize(text(options.context), usable);
            label(lines, margin, y, 8);
            y += lines.length * 4 + 6;
        }
        const charts = options.charts || [];
        for (const chart of charts) {
            const cardHeight = 100;
            if (y + cardHeight > height - 23) { doc.addPage(); y = 65; }
            doc.setDrawColor(palette.line);
            doc.roundedRect(margin, y, usable, cardHeight, 2, 2, 'S');
            label(chart.title, margin + 4, y + 7, 10, palette.ink, true);
            const imageWidth = Math.min(usable - 8, (cardHeight - 16) * chart.aspect);
            doc.addImage(chart.image, 'PNG', margin + (usable - imageWidth) / 2, y + 12, imageWidth, imageWidth / chart.aspect);
            y += cardHeight + 6;
        }
        if (charts.length && options.sections?.length) { doc.addPage(); y = 65; }
        for (const section of options.sections || []) {
            if (y > height - 55) { doc.addPage(); y = 65; }
            const columns = section.columns;
            const rightColumns = section.numeric || [];
            doc.autoTable({
                startY: y,
                margin: { top: 65, left: margin, right: margin, bottom: 23 },
                head: [
                    [{ content: section.title, colSpan: columns.length, styles: { fillColor: palette.ink, textColor: '#FFFFFF', fontSize: 10, cellPadding: 4 } }],
                    columns
                ],
                body: section.rows.length ? section.rows.map(row => row.map(text)) : [[{ content: 'Tidak ada data pada periode ini.', colSpan: columns.length }]],
                ...(section.totals ? { foot: [section.totals.map(text)], showFoot: 'lastPage' } : {}),
                theme: 'plain',
                showHead: 'everyPage',
                rowPageBreak: 'avoid',
                styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak', textColor: palette.ink, lineColor: palette.line, lineWidth: { bottom: 0.15 }, valign: 'middle' },
                headStyles: { fillColor: palette.light, textColor: palette.muted, fontStyle: 'bold', fontSize: 7.5 },
                alternateRowStyles: { fillColor: '#F8FAFC' },
                footStyles: { fillColor: '#EAF0F7', fontStyle: 'bold', textColor: palette.ink },
                columnStyles: Object.fromEntries(rightColumns.map(index => [index, { halign: 'right' }])),
                didParseCell: data => {
                    if ((data.section !== 'head' || data.row.index === 1) && rightColumns.includes(data.column.index)) data.cell.styles.halign = 'right';
                }
            });
            y = doc.lastAutoTable.finalY + 9;
        }
        if (options.note) {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
            const lines = doc.splitTextToSize(text(options.note), usable - 10);
            // Notes can span pages without overrunning the footer.
            for (const line of lines) {
                if (y > height - 25) { doc.addPage(); y = 65; }
                label(line, margin, y, 8); y += 4;
            }
            y += 6;
        }
        if (options.signatures?.length) {
            if (y + 32 > height - 23) { doc.addPage(); y = 65; }
            const signWidth = usable / options.signatures.length;
            options.signatures.forEach((name, i) => {
                const x = margin + i * signWidth;
                label('APPROVAL', x, y, 6.5, palette.muted, true);
                doc.setDrawColor(palette.line);
                doc.line(x, y + 21, x + signWidth - 12, y + 21);
                label(name, x, y + 27, 8, palette.ink);
            });
        }
        const pages = doc.internal.getNumberOfPages();
        for (let page = 1; page <= pages; page++) {
            doc.setPage(page);
            header();
            doc.setDrawColor(palette.line);
            doc.line(margin, height - 18, width - margin, height - 18);
            label('SKY AGENCY  /  ' + (options.confidential === false ? 'BUSINESS DOCUMENT' : 'CONFIDENTIAL'), margin, height - 12, 6.5, palette.muted, true);
            label(`Halaman ${page} / ${pages}`, width - margin, height - 12, 7, palette.muted, false, { align: 'right' });
        }
        return { doc, filename: `Sky-Agency-${reference}.pdf` };
    }
    function download(options) {
        try {
            const report = createReport(options);
            report.doc.save(report.filename);
            if (typeof showToast === 'function') showToast('PDF berhasil dibuat.', 'success');
        } catch (error) {
            console.error('PDF export failed:', error);
            if (typeof showToast === 'function') showToast(error.message || 'PDF gagal dibuat. Silakan coba lagi.', 'error');
        }
    }
    window.SkyPdf = { download, chartImages, money, date, sum };
})();
