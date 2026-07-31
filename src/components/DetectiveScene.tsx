import { FileSearch, ScanLine, Search, Sparkles } from "lucide-react";

/** Decorative, non-interactive scene for the home mission entry. */
export function DetectiveScene() {
  return (
    <div aria-hidden="true" className="detective-scene">
      <div className="detective-scene__grid" />
      <div className="detective-scene__orbit detective-scene__orbit--one" />
      <div className="detective-scene__orbit detective-scene__orbit--two" />
      <div className="detective-scene__case-file"><FileSearch size={72} strokeWidth={1.7} /></div>
      <div className="detective-scene__lens"><Search size={84} strokeWidth={2.2} /></div>
      <ScanLine className="detective-scene__scan" size={42} strokeWidth={2.3} />
      <Sparkles className="detective-scene__spark detective-scene__spark--one" size={25} />
      <Sparkles className="detective-scene__spark detective-scene__spark--two" size={19} />
    </div>
  );
}

