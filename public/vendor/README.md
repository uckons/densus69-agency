# PDF libraries

Locally served browser distributions, obtained from the npm registry with npm integrity verification:

- `jspdf` 4.2.1 — `dist/jspdf.umd.min.js`, MIT license included.
- `jspdf-autotable` 5.0.8 — `dist/jspdf.plugin.autotable.min.js`, MIT license included.

These files allow direct vector PDF downloads without a CDN, browser print dialog, or a new server runtime dependency. Load jsPDF first, then AutoTable, then `/js/pdf-reports.js`.
