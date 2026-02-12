import React from "react";

export function pctFromDb(db: number, minDb: number, maxDb: number) {
  const pct = ((db - minDb) / (maxDb - minDb)) * 100;
  return Math.max(0, Math.min(100, pct));
}

export type DbScaleProps = {
  marks: number[];
  minDb: number;
  maxDb: number;
  className?: string;

  /**
   * Ajuste fino em pixels para alinhar com o input range.
   * Ex: -2 desloca tudo 2px pra esquerda; +2 desloca 2px pra direita.
   */
  offsetPx?: number;

  /**
   * Compensa a "mordida" do thumb nas pontas.
   * Ex: 8 = deixa a escala 8px menor em cada lado.
   */
  insetPx?: number;
};

export default function DbScale({
  marks,
  minDb,
  maxDb,
  className,
  offsetPx = 0,
  insetPx = 0
}: DbScaleProps) {
  return (
    <div className={`mt-2 ${className ?? ""}`}>
      {/* wrapper para aplicar inset (se quiser) */}
      <div
        className="relative h-6"
        style={{ marginLeft: insetPx }}
      >
        {marks.map((m) => {
          const p = pctFromDb(m, minDb, maxDb);

          return (
            <div
              key={m}
              className="absolute top-0"
              style={{
                // ✅ aqui entra o offset em pixels
                left: `calc(${p}% + ${offsetPx}px)`,
                // centraliza o tick no ponto
                transform: "translateX(-50%)"
              }}
            >
              <div className="h-2 w-px bg-smx-line" />
              <div className="mt-1 text-[11px] text-smx-muted select-none whitespace-nowrap">
                {m}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
