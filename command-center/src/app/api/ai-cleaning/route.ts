import { NextResponse } from "next/server";
import { parseEquipmentList } from "@/lib/parsers/equipment-parser";

// Enkel stub för AI-förslag.
// TODO: Byt ut mot riktig LLM-integration (t.ex. via OpenAI/Vertex)
// och gör stavningsrättning/sammanslagning på serversidan.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { raw: string | undefined }
      | null;

    const raw = body?.raw?.trim() ?? "";
    if (!raw) {
      return NextResponse.json(
        { error: "Ingen text att analysera." },
        { status: 400 }
      );
    }

    const heuristic = parseEquipmentList(raw);

    // Pseudo-"AI"-förslag: kapitalisera och trimma lite.
    const aiSuggestion = heuristic.map((item) => {
      const t = item.trim();
      if (!t) return t;
      return t.charAt(0).toUpperCase() + t.slice(1);
    });

    return NextResponse.json({
      heuristic,
      ai: aiSuggestion,
    });
  } catch (err) {
    console.error("[ai-cleaning] error", err);
    return NextResponse.json(
      { error: "Kunde inte generera AI-förslag." },
      { status: 500 }
    );
  }
}

