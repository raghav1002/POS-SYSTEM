"use client";

import React from "react";

// Code 128-B Patterns (ASCII 32 to 127)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                               // 100-106
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes string to Code 128-B bar width pattern array
 */
function encodeCode128B(text: string): string[] {
  const patterns: string[] = [];
  let checksum = START_CODE_B;

  // Start Code B
  patterns.push(CODE128_PATTERNS[START_CODE_B]);

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const code128Val = charCode - 32; // ASCII 32 is space (val 0)

    if (code128Val >= 0 && code128Val <= 95) {
      patterns.push(CODE128_PATTERNS[code128Val]);
      checksum += code128Val * (i + 1);
    } else {
      // Replace unsupported characters with '?'
      const questionVal = 63 - 32;
      patterns.push(CODE128_PATTERNS[questionVal]);
      checksum += questionVal * (i + 1);
    }
  }

  // Checksum
  const checksumVal = checksum % 103;
  patterns.push(CODE128_PATTERNS[checksumVal]);

  // Stop Code
  patterns.push(CODE128_PATTERNS[STOP_CODE]);

  return patterns;
}

interface Code128BarcodeProps {
  value: string;
  height?: number;
  barWidth?: number;
  className?: string;
  showText?: boolean;
}

export function Code128Barcode({
  value,
  height = 70,
  barWidth = 2,
  className = "",
  showText = true,
}: Code128BarcodeProps) {
  const cleanText = (value || "BARCODE123").trim();
  const patternList = encodeCode128B(cleanText);

  // Convert pattern strings to bars (alternating black and white bars)
  const rects: { x: number; width: number }[] = [];
  let currentX = 10; // Quiet zone padding

  patternList.forEach((pattern) => {
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10) * barWidth;
      if (isBar) {
        rects.push({ x: currentX, width });
      }
      currentX += width;
      isBar = !isBar;
    }
  });

  const totalWidth = currentX + 10; // Right quiet zone

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={totalWidth}
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="max-w-full h-auto"
      >
        <rect width="100%" height="100%" fill="white" />
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={5}
            width={r.width}
            height={height - 20}
            fill="black"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-widest mt-1">
          {cleanText}
        </span>
      )}
    </div>
  );
}

/**
 * Generates raw SVG string for Code128 barcode (used in print windows & exports)
 */
export function generateCode128SvgMarkup(
  value: string,
  height = 50,
  barWidth = 1.4,
  showText = true
): string {
  const cleanText = (value || "BARCODE123").trim();
  const patternList = encodeCode128B(cleanText);

  const rects: { x: number; width: number }[] = [];
  let currentX = 10;

  patternList.forEach((pattern) => {
    let isBar = true;
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10) * barWidth;
      if (isBar) {
        rects.push({ x: currentX, width });
      }
      currentX += width;
      isBar = !isBar;
    }
  });

  const totalWidth = currentX + 10;
  const barHeight = showText ? height - 16 : height - 4;

  const rectsSvg = rects
    .map((r) => `<rect x="${r.x}" y="2" width="${r.width}" height="${barHeight}" fill="black" />`)
    .join("");

  const textSvg = showText
    ? `<text x="${totalWidth / 2}" y="${height - 2}" font-family="monospace" font-size="10" font-weight="bold" text-anchor="middle" fill="black">${cleanText}</text>`
    : "";

  return `<svg width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" xmlns="http://www.w3.org/2000/svg" style="max-width: 100%; height: auto;"><rect width="100%" height="100%" fill="white"/>${rectsSvg}${textSvg}</svg>`;
}

/**
 * Generate random alphanumeric barcode (e.g. BC-8942-A1)
 */
export function generateAlphanumericBarcode(prefix = "BC"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
}
