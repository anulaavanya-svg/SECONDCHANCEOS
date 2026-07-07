import ChatPanel from '@/components/assistant/ChatPanel'

export default function ManagerAssistantPage() {
  return (
    <ChatPanel
      persona="manager"
      title="Coaching Assistant"
      subtitle="Evidence-based coaching support. Decisions stay with you — and your decision trees."
      starters={[
        'How do I open a conversation about a missed shift without putting them on the defensive?',
        'Give me coaching language for a feedback conversation about work pace.',
        'Role-play a conversation where an employee discloses a housing problem.',
        'Why does a non-punitive first response work better psychologically?',
      ]}
    />
  )
}
