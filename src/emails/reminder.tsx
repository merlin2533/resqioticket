import {
  Body, Container, Head, Heading, Hr,
  Html, Preview, Row, Column, Section, Text, Tailwind,
} from "@react-email/components";

interface ReminderEmailProps {
  agentName: string;
  tickets: { number: number; subject: string; createdAt: Date; priority: string }[];
}

const priorityBadge: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH:   "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function ReminderEmail({ agentName, tickets }: ReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${tickets.length} offene Ticket(s) warten auf Bearbeitung`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] py-8 px-4">
            <Section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <Heading className="text-2xl font-bold text-gray-900 m-0 mb-2">
                Erinnerung: Offene Tickets
              </Heading>
              <Text className="text-gray-500 m-0 mb-6">
                Hallo {agentName}, folgende Tickets warten auf Ihre Bearbeitung:
              </Text>
              {tickets.map((t) => (
                <Section key={t.number} className="border border-gray-100 rounded-lg p-3 mb-3">
                  <Row>
                    <Column className="w-12">
                      <Text className="text-sm font-bold text-gray-400 m-0">#{t.number}</Text>
                    </Column>
                    <Column>
                      <Text className="text-sm font-medium text-gray-900 m-0">{t.subject}</Text>
                      <Text className="text-xs text-gray-400 m-0">
                        {new Date(t.createdAt).toLocaleDateString("de-DE")}
                      </Text>
                    </Column>
                    <Column className="w-20 text-right">
                      <Text className={`text-xs font-medium px-2 py-1 rounded m-0 inline-block ${priorityBadge[t.priority] ?? ""}`}>
                        {t.priority}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}
              <Hr className="border-gray-200 my-6" />
              <Text className="text-xs text-gray-400 m-0">
                Erinnerungen koennen pro Agent deaktiviert werden.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
