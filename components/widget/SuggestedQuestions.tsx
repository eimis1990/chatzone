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
  if (questions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="text-sm px-3 py-1.5 rounded-full border border-current transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-left"
          style={{ color: primaryColor, borderColor: primaryColor }}
        >
          {q}
        </button>
      ))}
    </div>
  )
}
