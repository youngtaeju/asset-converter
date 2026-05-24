type TopbarProps = {
  onOpenHealth: () => void
}

export function Topbar({ onOpenHealth }: TopbarProps) {
  return (
    <header className="topbar">
      <h1>Asset Converter</h1>
      <button className="status-badge" type="button" onClick={onOpenHealth}>
        API 상태
      </button>
    </header>
  )
}
