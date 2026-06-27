'use client';
import { useRef, useState, useEffect, type ReactNode } from 'react';

// Escala el contenido para que quepa completo en el ancho disponible (sin scroll
// horizontal). En PC se ve a tamaño natural; en pantallas angostas/celular se
// reduce para verse de una sola vez.
function AutoFit({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const measure = () => {
      const outer = outerRef.current, inner = innerRef.current;
      if (!outer || !inner) return;
      const nw = inner.scrollWidth;
      const s = nw > 0 ? Math.min(1, outer.clientWidth / nw) : 1;
      setScale(s);
      setHeight(inner.scrollHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="overflow-hidden" style={{ height }}>
      <div ref={innerRef} style={{ width: 'max-content', transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

// Estructura del cuadro eliminatorio (Mundial 2026), dividido en dos mitades que
// convergen hacia la final en el centro. Los IDs salen de KO_FEEDERS en matchData.
//
//   16avos  Octavos  Cuartos  Semis   FINAL   Semis  Cuartos  Octavos  16avos
//   (izq) ───────────────────────►  (centro) ◄───────────────────────  (der)
export const BRACKET = {
  left:  { r32: [74, 77, 73, 75, 83, 84, 81, 82], r16: [89, 90, 93, 94], qf: [97, 98], sf: [101] },
  right: { r32: [76, 78, 79, 80, 86, 88, 85, 87], r16: [91, 92, 95, 96], qf: [99, 100], sf: [102] },
  final: 104,
  third: 103,
};

type Col = { key: string; label: string; ids: number[]; dir: 'l' | 'r' | 'c' };
const COLS: Col[] = [
  { key: 'l32', label: '16avos',  ids: BRACKET.left.r32,  dir: 'l' },
  { key: 'l16', label: 'Octavos', ids: BRACKET.left.r16,  dir: 'l' },
  { key: 'lqf', label: 'Cuartos', ids: BRACKET.left.qf,   dir: 'l' },
  { key: 'lsf', label: 'Semis',   ids: BRACKET.left.sf,   dir: 'l' },
  { key: 'fin', label: '🏆 Final', ids: [BRACKET.final],  dir: 'c' },
  { key: 'rsf', label: 'Semis',   ids: BRACKET.right.sf,  dir: 'r' },
  { key: 'rqf', label: 'Cuartos', ids: BRACKET.right.qf,  dir: 'r' },
  { key: 'r16', label: 'Octavos', ids: BRACKET.right.r16, dir: 'r' },
  { key: 'r32', label: '16avos',  ids: BRACKET.right.r32, dir: 'r' },
];

// Renderiza el cuadro completo. `renderNode(id)` dibuja cada partido; el layout se
// encarga de la posición simétrica y la alineación vertical entre rondas.
export function BracketLayout({ renderNode, nodeWidth = 168, thirdNode }: {
  renderNode: (matchId: number) => ReactNode;
  nodeWidth?: number;
  thirdNode?: ReactNode;
}) {
  return (
    <div className="pb-4 fade-in">
      <AutoFit>
        {/* Encabezados de ronda */}
        <div className="flex gap-2 min-w-max mb-2 px-1">
          {COLS.map(c => (
            <div key={c.key} className={`text-center text-xs font-black uppercase tracking-wide ${c.dir === 'c' ? 'text-amber-300' : 'text-amber-400'}`}
              style={{ width: nodeWidth }}>{c.label}</div>
          ))}
        </div>
        {/* Cuerpo del bracket */}
        <div className="flex gap-2 min-w-max items-stretch px-1">
          {COLS.map(c => (
            <div key={c.key}
              className={`flex flex-col ${c.ids.length === 1 ? 'justify-center' : 'justify-around'}`}
              style={{ width: nodeWidth }}>
              {c.ids.map(id => (
                <div key={id} className="relative">
                  {renderNode(id)}
                  {c.dir !== 'c' && (
                    <div className="absolute top-1/2 h-px bg-white/20"
                      style={{ width: 8, [c.dir === 'l' ? 'right' : 'left']: -8 }} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </AutoFit>
      {/* 3er puesto (debajo de la final) */}
      {thirdNode && (
        <div className="flex flex-col items-center mt-5">
          <div className="text-center text-xs font-black text-amber-400 uppercase tracking-wide mb-1">🥉 3er Puesto</div>
          <div style={{ width: nodeWidth * 1.5, maxWidth: '90%' }}>{thirdNode}</div>
        </div>
      )}
    </div>
  );
}
