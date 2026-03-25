import React from "react";

export default function SpeakerPresetLocked({
  title = "Preset Locked",
  message = "This manufacturer preset is protected. Parameters cannot be viewed or edited."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <section className="bg-smx-panel border border-smx-line rounded-2xl overflow-hidden">
      <div className="p-10 md:p-14 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-2xl border border-smx-line bg-smx-panel2 flex items-center justify-center text-4xl mb-5">
          🔒
        </div>

        <div className="text-xl font-semibold text-smx-text">{title}</div>
        <div className="mt-2 text-sm md:text-xs text-smx-muted max-w-[420px] leading-6">
          {message}
        </div>
      </div>
    </section>
  );
}