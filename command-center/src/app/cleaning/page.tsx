"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Wand2 } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { parseEquipmentList } from "../../lib/parsers/equipment-parser";

type ParsedResult = string[];

interface EquipmentMapping {
  id: string;
  raw_string: string;
  refined_list: string[];
  confidence: number;
  confirmed: boolean;
}

export default function CleaningLabPage() {
  const [raw, setRaw] = useState("");
  const [heuristic, setHeuristic] = useState<ParsedResult>([]);
  const [aiSuggestion, setAiSuggestion] = useState<ParsedResult>([]);
  const [selectedBase, setSelectedBase] = useState<"heuristic" | "ai" | null>(
    null
  );
  const [manualLines, setManualLines] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mappings, setMappings] = useState<EquipmentMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [activeMappingId, setActiveMappingId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const loadMappings = async () => {
      setLoadingMappings(true);
      try {
        const { data, error } = await supabase
          .from("equipment_mappings")
          .select("id, raw_string, refined_list, confidence, confirmed")
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) {
          console.error("[cleaning-lab] load mappings error", error);
          return;
        }
        setMappings((data as EquipmentMapping[]) ?? []);
      } catch (err) {
        console.error("[cleaning-lab] load mappings error", err);
      } finally {
        setLoadingMappings(false);
      }
    };
    loadMappings();
  }, [supabase]);

  const syncManualFromSelection = (source: "heuristic" | "ai") => {
    const base = source === "heuristic" ? heuristic : aiSuggestion;
    setManualLines(base.join("\n"));
    setSelectedBase(source);
  };

  const handleAnalyze = async () => {
    setError(null);
    setSuccess(null);
    const text = raw.trim();
    if (!text) {
      setError("Klistra in en utrustningssträng först.");
      return;
    }
    setLoading(true);
    try {
      const heur = parseEquipmentList(text);
      setHeuristic(heur);

      const res = await fetch("/api/ai-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        setError(json?.error ?? "Kunde inte hämta AI-förslag. Visar endast heuristik.");
        setAiSuggestion([]);
      } else {
        const aiList = Array.isArray(json.ai) ? (json.ai as string[]) : [];
        setAiSuggestion(aiList);
      }
    } catch (err) {
      console.error("[cleaning-lab] analyze error", err);
      setError("Något gick fel vid analysen.");
      setAiSuggestion([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setError(null);
    setSuccess(null);
    const text = raw.trim();
    if (!text) {
      setError("Ingen råsträng att spara.");
      return;
    }
    const refined = manualLines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!refined || refined.length === 0) {
      setError("Inget resultat att spara.");
      return;
    }

    setSaving(true);
    try {
      const { error: dbError } = await supabase
        .from("equipment_mappings")
        .upsert(
          {
            raw_string: text,
            refined_list: refined,
            confidence: selectedBase === "ai" ? 85 : 70,
            confirmed: true,
            source: "manual",
          },
          { onConflict: "raw_string" }
        );

      if (dbError) {
        console.error("[cleaning-lab] upsert error", dbError);
        setError("Kunde inte spara mappningen i equipment_mappings.");
        return;
      }

      setSuccess("Mappning sparad i equipment_mappings.");
      const { data } = await supabase
        .from("equipment_mappings")
        .select("id, raw_string, refined_list, confidence, confirmed")
        .order("created_at", { ascending: false })
        .limit(50);
      setMappings((data as EquipmentMapping[]) ?? []);
      // TODO: Uppdatera Smistabil-/importlogik i huvudprojektet (sokhar)
      // så att den alltid kollar equipment_mappings (raw_string) först
      // innan den kör parseEquipmentList.
    } catch (err) {
      console.error("[cleaning-lab] apply error", err);
      setError("Ett oväntat fel uppstod vid sparande.");
    } finally {
      setSaving(false);
    }
  };

  const renderList = (items: string[]) => {
    if (!items || items.length === 0) {
      return <p className="text-xs text-slate-500">Inga poster.</p>;
    }
    return (
      <ul className="mt-2 space-y-1 text-xs text-slate-900">
        {items.map((item, idx) => (
          <li key={idx} className="flex gap-2">
            <span className="mt-0.5 text-[10px]">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-black">
            AI Cleaning Lab
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Neo-brutalistisk verkstad för att städa bilutrustning – du är
            Master of Data.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-yellow-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-[3px_3px_0_0_rgba(0,0,0,1)]">
          <Wand2 className="h-3 w-3" />
          Cleaning Mode
        </span>
      </div>

        <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="rounded-full border-2 border-black bg-yellow-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                Steg 1
              </span>
              <p className="text-xs font-semibold text-slate-900">
                Klistra in rå text från importen
              </p>
            </div>
            <label className="block text-xs font-semibold text-slate-800">
              Smutsig utrustningssträng
            </label>
            <p className="mt-1 text-[11px] text-slate-600">
              Rå utrustning direkt från CSV/XML. Vi använder heuristik och AI
              som första förslag.
            </p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border-4 border-slate-950 bg-white px-3 py-2 text-sm text-slate-900 shadow-[4px_4px_0px_0px_#0f172a] outline-none placeholder:text-slate-400 focus:border-emerald-400 font-mono"
              placeholder="Ex: Adaptiv farthållare (ACC)Keyless Entry & StartLäderklädsel..."
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-950 bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {loading ? "Analyserar..." : "KÖR ANALYS"}
              </button>
              {error && (
                <span className="text-xs font-medium text-red-500">{error}</span>
              )}
              {success && (
                <span className="text-xs font-medium text-emerald-600">
                  {success}
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border-4 border-slate-950 bg-[#f7f7f7] p-3 shadow-[4px_4px_0px_0px_#020617]">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-800">
              Pending mappings
            </h2>
            <p className="mt-1 text-[11px] text-slate-600">
              Senaste utrustningssträngar (från importer / manuella sparningar) – klicka för att ladda.
            </p>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border-2 border-slate-800 bg-white">
              {loadingMappings ? (
                <p className="p-2 text-[11px] text-slate-500">Laddar…</p>
              ) : mappings.length === 0 ? (
                <p className="p-2 text-[11px] text-slate-500">Inga mappningar ännu.</p>
              ) : (
                <ul className="divide-y divide-slate-200 text-[11px] text-slate-900">
                  {mappings.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMappingId(m.id);
                          setRaw(m.raw_string);
                          const h = parseEquipmentList(m.raw_string);
                          setHeuristic(h);
                          const ai = m.refined_list ?? [];
                          setAiSuggestion(ai);
                          setSelectedBase("ai");
                          setManualLines(ai.join("\n"));
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left hover:bg-slate-800 ${
                          activeMappingId === m.id ? "bg-slate-800" : ""
                        }`}
                      >
                        <span className="line-clamp-1">{m.raw_string}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {m.refined_list?.length ?? 0} • {m.confidence}%
                          {m.confirmed ? " ✅" : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Heuristik-kort */}
          <button
            type="button"
            onClick={() => syncManualFromSelection("heuristic")}
            className={`flex h-full flex-col rounded-2xl border-4 border-black p-4 text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition ${
              selectedBase === "heuristic"
                ? "ring-4 ring-emerald-400"
                : "ring-0 hover:-translate-y-0.5"
            }`}
            style={{ backgroundColor: "#fef9c3" }} // blekgul
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Kort A – Heuristiken
                </h2>
                <p className="text-[11px] text-slate-700">
                  Nuvarande parseEquipmentList-resultat.
                </p>
              </div>
              <CheckCircle2
                className={`h-6 w-6 ${
                  selectedBase === "heuristic"
                    ? "text-emerald-600"
                    : "text-slate-500"
                }`}
              />
            </div>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-xl border-2 border-black/40 bg-yellow-50/80 p-3">
              {renderList(heuristic)}
            </div>
          </button>

          {/* AI-kort */}
          <button
            type="button"
            onClick={() => syncManualFromSelection("ai")}
            className={`flex h-full flex-col rounded-2xl border-4 border-black p-4 text-left shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition ${
              selectedBase === "ai"
                ? "ring-4 ring-emerald-400"
                : "ring-0 hover:-translate-y-0.5"
            }`}
            style={{ backgroundColor: "#bbf7d0" }} // neon-grön-ish
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Kort B – AI Suggestion
                </h2>
                <p className="text-[11px] text-slate-700">
                  Förslag från LLM (stub i nuläget – kapitaliserar heuristiken).
                </p>
              </div>
              <CheckCircle2
                className={`h-6 w-6 ${
                  selectedBase === "ai" ? "text-emerald-600" : "text-slate-500"
                }`}
              />
            </div>
            <div className="mt-1 max-h-64 overflow-y-auto rounded-xl border-2 border-black/40 bg-emerald-100 p-3">
              {renderList(aiSuggestion)}
            </div>
          </button>
        </section>

        <section className="mt-5 rounded-2xl border-4 border-slate-950 bg-slate-100 p-4 shadow-[4px_4px_0px_0px_#020617]">
          <div className="mb-2 inline-flex items-center gap-2">
            <span className="rounded-full border-2 border-black bg-yellow-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
              Steg 2
            </span>
            <h2 className="text-sm font-semibold text-slate-900">
              Manuell finjustering (det som sparas)
            </h2>
          </div>
          <p className="mt-1 text-[11px] text-slate-600">
            Här kan du lägga till/ta bort rader. Varje rad blir en egen post i{" "}
            <code className="rounded border border-black/20 bg-[#f0f0f0] px-1 py-0.5 text-[10px] text-slate-900">refined_list</code>.
          </p>
          <textarea
            value={manualLines}
            onChange={(e) => setManualLines(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border-4 border-slate-950 bg-white px-3 py-2 text-xs text-slate-900 shadow-[3px_3px_0px_0px_#0f172a] outline-none placeholder:text-slate-500 focus:border-emerald-400 font-mono"
            placeholder={"Adaptiv farthållare (ACC)\nKeyless Entry & Start\nLäderklädsel"}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="rounded-full border-2 border-black bg-yellow-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                Steg 3
              </span>
              <span className="text-[11px] font-semibold text-slate-900">
                Spara till master-mappningen
              </span>
            </div>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl border-4 border-slate-950 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 shadow-[4px_4px_0px_0px_#0f172a] transition hover:bg-slate-200 disabled:opacity-60"
            >
              {saving ? "Sparar..." : "Apply to Master Logic"}
            </button>
          </div>
        </section>
    </div>
  );
}

