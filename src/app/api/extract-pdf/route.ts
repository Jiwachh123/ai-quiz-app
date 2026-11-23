import { NextResponse } from "next/server";
import zlib from "zlib";

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const rawLatin = buffer.toString("latin1");
  const chunks: string[] = [];

  // 1. Decompress FlateDecode streams using Node's built-in zlib
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawLatin)) !== null) {
    const streamStr = match[1];
    const streamBuf = Buffer.from(streamStr, "latin1");
    let decoded = "";

    try {
      decoded = zlib.inflateSync(streamBuf).toString("latin1");
    } catch {
      try {
        decoded = zlib.inflateRawSync(streamBuf).toString("latin1");
      } catch {
        decoded = streamStr;
      }
    }

    // Extract text inside PDF Tj / TJ operators
    const parenStrings = decoded.match(/\(([^()\\]|\\.)*\)/g);
    if (parenStrings) {
      for (const s of parenStrings) {
        const inner = decodePdfLiteralString(s.slice(1, -1));
        if (/[a-zA-Z0-9]{2,}/.test(inner)) {
          chunks.push(inner);
        }
      }
    }
  }

  let text = chunks.join(" ").replace(/\s+/g, " ").trim();

  // Fallback if uncompressed PDF text
  if (text.length < 40) {
    const fallbackMatches = rawLatin.match(/\(([^()\\]{3,}|\\.)*\)/g) || [];
    text = fallbackMatches
      .map((s) => decodePdfLiteralString(s.slice(1, -1)))
      .filter((s) => /[a-zA-Z]{2,}/.test(s))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return text.slice(0, 6000);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = (file as File).name || "syllabus";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      extractedText = extractTextFromPdfBuffer(buffer);
    } else {
      extractedText = buffer.toString("utf8").replace(/\s+/g, " ").trim().slice(0, 6000);
    }

    if (!extractedText || extractedText.length < 20) {
      return NextResponse.json(
        {
          text: "",
          warning:
            "This PDF appears to be a scanned image or uses custom font encoding. Please paste the syllabus text directly in the box below.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      fileName,
      text: extractedText,
      characters: extractedText.length,
    });
  } catch (error) {
    console.error("Extract PDF error:", error);
    return NextResponse.json(
      { error: "Could not read file. You can paste your syllabus text directly." },
      { status: 500 }
    );
  }
}
