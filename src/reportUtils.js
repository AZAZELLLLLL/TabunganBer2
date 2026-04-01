import * as XLSX from "xlsx";

const HEADER_ALIASES = {
  date: ["tanggal", "date", "tanggal transaksi", "tanggal & waktu", "datetime"],
  time: ["waktu", "jam", "time"],
  name: ["nama", "name", "nama pengguna", "user", "username", "user name"],
  role: ["tipe", "role", "jenis", "gender", "pasangan"],
  amount: ["jumlah", "amount", "jumlah (rp)", "nominal", "rupiah"],
};

const ROLE_LABELS = {
  cowo: "Cowok",
  cewe: "Cewe",
};

function toDateObject(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (value?.toDate) {
    const converted = value.toDate();
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForTable(value) {
  const date = toDateObject(value);
  if (!date) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeForTable(value) {
  const date = toDateObject(value);
  if (!date) return "-";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function slugifyFileName(value) {
  return String(value || "laporan-tabungan")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function extractColumnValue(row, aliases) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    normalizeHeader(key),
    value,
  ]);

  for (const alias of aliases) {
    const found = normalizedEntries.find(([key]) => key === alias);
    if (found) return found[1];
  }

  return "";
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  const normalized = value
    .replace(/rp/gi, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");

  return Number(normalized);
}

function parseTimeParts(value) {
  if (!value && value !== 0) return null;

  if (value instanceof Date) {
    return {
      hours: value.getHours(),
      minutes: value.getMinutes(),
      seconds: value.getSeconds(),
    };
  }

  if (typeof value === "number" && value >= 0 && value < 1) {
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  const match = String(value)
    .trim()
    .match(/(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/);

  if (!match) return null;

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
    seconds: Number(match[3] || 0),
  };
}

function createDateFromParts(year, month, day, hours = 0, minutes = 0, seconds = 0) {
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateValue(value, timeValue) {
  const timeParts = parseTimeParts(timeValue);

  if (value instanceof Date) {
    const date = new Date(value);
    if (timeParts) {
      date.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
    }
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return createDateFromParts(
        parsed.y,
        parsed.m,
        parsed.d,
        timeParts?.hours ?? parsed.H ?? 0,
        timeParts?.minutes ?? parsed.M ?? 0,
        timeParts?.seconds ?? Math.floor(parsed.S || 0)
      );
    }
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  const dateTimeMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (dateTimeMatch) {
    return createDateFromParts(
      Number(dateTimeMatch[1]),
      Number(dateTimeMatch[2]),
      Number(dateTimeMatch[3]),
      timeParts?.hours ?? Number(dateTimeMatch[4] || 0),
      timeParts?.minutes ?? Number(dateTimeMatch[5] || 0),
      timeParts?.seconds ?? Number(dateTimeMatch[6] || 0)
    );
  }

  const slashMatch = raw.match(
    /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (slashMatch) {
    return createDateFromParts(
      Number(slashMatch[3]),
      Number(slashMatch[2]),
      Number(slashMatch[1]),
      timeParts?.hours ?? Number(slashMatch[4] || 0),
      timeParts?.minutes ?? Number(slashMatch[5] || 0),
      timeParts?.seconds ?? Number(slashMatch[6] || 0)
    );
  }

  const fallback = new Date(raw);
  if (Number.isNaN(fallback.getTime())) return null;

  if (timeParts) {
    fallback.setHours(timeParts.hours, timeParts.minutes, timeParts.seconds || 0, 0);
  }

  return fallback;
}

function normalizeRole(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["cowo", "cowo ", "cowok", "pria", "male", "laki", "laki-laki"].includes(normalized)) {
    return "cowo";
  }

  if (["cewe", "cewek", "wanita", "female", "perempuan"].includes(normalized)) {
    return "cewe";
  }

  return "";
}

function buildFileName(monthLabel) {
  const slug = slugifyFileName(monthLabel || "laporan-tabungan");
  return `laporan-tabungan-${slug}`;
}

export function buildSavingsExportRows(savings = []) {
  return savings.map((saving, index) => ({
    No: index + 1,
    Tanggal: formatDateForTable(saving.date),
    Waktu: formatTimeForTable(saving.date),
    Nama: saving.userName || "-",
    Tipe: ROLE_LABELS[saving.role] || saving.role || "-",
    "Jumlah (Rp)": Number(saving.amount || 0),
  }));
}

export function exportSavingsToExcel({ savings = [], monthLabel = "", summary = {} }) {
  const detailRows = buildSavingsExportRows(savings);
  const workbook = XLSX.utils.book_new();

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 12 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detail Tabungan");

  const summaryRows = [
    ["Laporan Detail Tabungan", ""],
    ["Periode", monthLabel],
    ["Total transaksi", Number(summary.totalTransactions || 0)],
    ["Total tabungan", Number(summary.totalAmount || 0)],
    ["Kontribusi cowo", Number(summary.cowoAmount || 0)],
    ["Kontribusi cewe", Number(summary.ceweAmount || 0)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");

  XLSX.writeFile(workbook, `${buildFileName(monthLabel)}.xlsx`);
}

export function exportSavingsToWord({ savings = [], monthLabel = "", summary = {} }) {
  const rowsHtml = savings
    .map((saving, index) => {
      const amount = Number(saving.amount || 0).toLocaleString("id-ID");

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatDateForTable(saving.date))}</td>
          <td>${escapeHtml(formatTimeForTable(saving.date))}</td>
          <td>${escapeHtml(saving.userName || "-")}</td>
          <td>${escapeHtml(ROLE_LABELS[saving.role] || saving.role || "-")}</td>
          <td>Rp ${escapeHtml(amount)}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Laporan Detail Tabungan</title>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          h1 { color: #5A4A5C; }
          .summary { margin: 18px 0; }
          .summary-table, .detail-table { border-collapse: collapse; width: 100%; }
          .summary-table td, .detail-table td, .detail-table th {
            border: 1px solid #d7c5d9;
            padding: 8px 10px;
          }
          .detail-table th {
            background: #efe1f2;
            text-align: left;
          }
          .summary-label { width: 220px; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Laporan Detail Tabungan</h1>
        <p>Periode: ${escapeHtml(monthLabel)}</p>
        <div class="summary">
          <table class="summary-table">
            <tr><td class="summary-label">Total transaksi</td><td>${Number(
              summary.totalTransactions || 0
            )}</td></tr>
            <tr><td class="summary-label">Total tabungan</td><td>Rp ${Number(
              summary.totalAmount || 0
            ).toLocaleString("id-ID")}</td></tr>
            <tr><td class="summary-label">Kontribusi cowo</td><td>Rp ${Number(
              summary.cowoAmount || 0
            ).toLocaleString("id-ID")}</td></tr>
            <tr><td class="summary-label">Kontribusi cewe</td><td>Rp ${Number(
              summary.ceweAmount || 0
            ).toLocaleString("id-ID")}</td></tr>
          </table>
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Waktu</th>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Jumlah</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob(["\ufeff", html], { type: "application/msword" }),
    `${buildFileName(monthLabel)}.doc`
  );
}

export async function parseSavingsImportFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  let candidateRows = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
      cellDates: true,
    });

    if (!rows.length) continue;

    const headers = Object.keys(rows[0]).map(normalizeHeader);
    const hasDate = headers.some((header) => HEADER_ALIASES.date.includes(header));
    const hasRole = headers.some((header) => HEADER_ALIASES.role.includes(header));
    const hasAmount = headers.some((header) => HEADER_ALIASES.amount.includes(header));

    if (hasDate && hasRole && hasAmount) {
      candidateRows = rows;
      break;
    }
  }

  if (!candidateRows.length) {
    throw new Error(
      "Format file tidak dikenali. Gunakan kolom Tanggal, Nama, Tipe, dan Jumlah."
    );
  }

  const parsedRows = candidateRows
    .map((row, index) => {
      const rawDate = extractColumnValue(row, HEADER_ALIASES.date);
      const rawTime = extractColumnValue(row, HEADER_ALIASES.time);
      const rawRole = extractColumnValue(row, HEADER_ALIASES.role);
      const rawAmount = extractColumnValue(row, HEADER_ALIASES.amount);

      const date = parseDateValue(rawDate, rawTime);
      const role = normalizeRole(rawRole);
      const amount = parseAmount(rawAmount);
      const userName = String(extractColumnValue(row, HEADER_ALIASES.name) || "").trim();

      return {
        sourceLine: index + 2,
        date,
        role,
        amount,
        userName,
      };
    })
    .filter((row) => row.date && row.role && Number.isFinite(row.amount) && row.amount > 0);

  if (!parsedRows.length) {
    throw new Error("Tidak ada baris valid yang bisa diimpor dari file tersebut.");
  }

  return parsedRows;
}
