export type ImportedRow = {
  amount: number; // signed: negative = expense
  date: string; // YYYY-MM-DD
  description: string;
  externalId?: string;
};

const MAX_ROWS = 5000;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Accepts "1.234,56", "1,234.56", "-12,5", "R$ 10,00" and "(10,00)".
export function parseMoney(raw: string): number | null {
  let value = raw.replace(/[^\d,.\-()]/g, "");
  const negative = value.startsWith("-") || /^\(.*\)$/.test(value);

  value = value.replace(/[-()]/g, "");

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  const lastSeparator = Math.max(lastComma, lastDot);
  const decimalSeparator = lastComma > lastDot ? "," : ".";
  // A trailing group of 1-2 digits is decimals; 3 digits is a thousands group.
  const hasDecimals =
    lastSeparator >= 0 && value.length - lastSeparator - 1 <= 2;

  value = hasDecimals
    ? value
        .replace(decimalSeparator === "," ? /\./g : /,/g, "")
        .replace(decimalSeparator, ".")
    : value.replace(/[.,]/g, "");

  const parsed = Number(value);

  if (!value || !Number.isFinite(parsed)) {
    return null;
  }

  return negative ? -parsed : parsed;
}

// Accepts DD/MM/YYYY, YYYY-MM-DD and OFX YYYYMMDD[HHMMSS...].
export function parseStatementDate(raw: string): string | null {
  const text = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  const ofx = /^(\d{4})(\d{2})(\d{2})/.exec(text);
  const [year, month, day] = iso
    ? [iso[1], iso[2], iso[3]]
    : br
      ? [br[3], br[2], br[1]]
      : ofx
        ? [ofx[1], ofx[2], ofx[3]]
        : [];

  if (!year) {
    return null;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);

  return cells.map((cell) => cell.trim());
}

export function parseCsvStatement(text: string): ImportedRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter =
    (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0)
      ? ";"
      : ",";
  const header = splitCsvLine(lines[0], delimiter).map(normalize);
  const find = (...names: string[]) =>
    header.findIndex((cell) => names.some((name) => cell.includes(name)));
  const dateIndex = find("data", "date");
  const descriptionIndex = find(
    "descri",
    "historico",
    "memo",
    "estabelecimento",
    "lancamento",
    "title",
  );
  const amountIndex = find("valor", "amount");
  const idIndex = find("identificador");

  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) {
    return [];
  }

  const rows: ImportedRow[] = [];

  for (const line of lines.slice(1, MAX_ROWS + 1)) {
    const cells = splitCsvLine(line, delimiter);
    const date = parseStatementDate(cells[dateIndex] ?? "");
    const amount = parseMoney(cells[amountIndex] ?? "");
    const description = (cells[descriptionIndex] ?? "").slice(0, 160);

    if (date && amount !== null && amount !== 0 && description) {
      const externalId = idIndex >= 0 ? cells[idIndex] : "";

      rows.push({
        amount,
        date,
        description,
        ...(externalId ? { externalId } : {}),
      });
    }
  }

  return rows;
}

export function parseOfxStatement(text: string): ImportedRow[] {
  const rows: ImportedRow[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1, MAX_ROWS + 1);
  // OFX 1.x has unclosed tags: read until the next "<" or newline.
  const tag = (block: string, name: string) =>
    new RegExp(`<${name}>([^<\\r\\n]*)`, "i").exec(block)?.[1]?.trim();

  for (const block of blocks) {
    const date = parseStatementDate(tag(block, "DTPOSTED") ?? "");
    const amount = parseMoney(tag(block, "TRNAMT") ?? "");
    const description = (tag(block, "MEMO") ?? tag(block, "NAME") ?? "").slice(
      0,
      160,
    );
    const externalId = tag(block, "FITID");

    if (date && amount !== null && amount !== 0 && description) {
      rows.push({
        amount,
        date,
        description,
        ...(externalId ? { externalId } : {}),
      });
    }
  }

  return rows;
}

export function parseStatement(fileName: string, text: string): ImportedRow[] {
  return /\.ofx$/i.test(fileName) || /<OFX>/i.test(text.slice(0, 2000))
    ? parseOfxStatement(text)
    : parseCsvStatement(text);
}
