'use client'

interface SuggestedQuestionsProps {
  questions: string[]
  primaryColor: string
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({
  questions,
  primaryColor,
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  const visible = questions.filter(Boolean).slice(0, 4)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-1">
      {visible.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border border-current transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-left leading-normal"
          style={{ color: primaryColor, borderColor: primaryColor }}
        >
          {q}
        </button>
      ))}
    </div>
  )
}
