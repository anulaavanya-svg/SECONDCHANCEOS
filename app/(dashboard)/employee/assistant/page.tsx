import ChatPanel from '@/components/assistant/ChatPanel'

export default function EmployeeAssistantPage() {
  return (
    <ChatPanel
      persona="employee"
      title="Your Support Assistant"
      subtitle="Questions about your onboarding, resources, or the workplace — ask away."
      starters={[
        'What should I expect in my first 30 days?',
        'What is a pulse survey and who sees my answers?',
        'How do I ask for time off for an appointment?',
        'Where can I find help with transportation to work?',
      ]}
    />
  )
}
