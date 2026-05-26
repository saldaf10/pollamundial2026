export function Flag({ isoCode, name, size = 28 }: { isoCode: string; name: string; size?: number }) {
  if (!isoCode) return <span className="text-slate-500">⚽</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${isoCode}.png`}
      alt={name}
      width={size}
      height={Math.round(size * 0.75)}
      className="rounded-sm inline-block object-cover flex-shrink-0"
      style={{ width: size, height: 'auto' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}
