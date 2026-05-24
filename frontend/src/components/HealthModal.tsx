type HealthModalProps = {
  response: string
  isLoading: boolean
  onClose: () => void
}

export function HealthModal({ response, isLoading, onClose }: HealthModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Health check</p>
            <h2 id="health-modal-title">API 상태</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <pre className="health-response">{isLoading ? '확인 중...' : response}</pre>
      </section>
    </div>
  )
}
