import {
  Body, Button, Container, Head, Heading, Hr,
  Html, Preview, Section, Text, Tailwind,
} from "@react-email/components";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: "Offen",         color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  IN_PROGRESS: { label: "In Bearbeitung",color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  WAITING:     { label: "Wartend",       color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  RESOLVED:    { label: "Geloest",       color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  CLOSED:      { label: "Geschlossen",   color: "text-gray-700",   bg: "bg-gray-50 border-gray-200" },
};

interface StatusChangedEmailProps {
  ticketNumber: number;
  subject: string;
  portalLink: string;
  recipientName: string;
  oldStatus: string;
  newStatus: string;
}

export default function StatusChangedEmail({
  ticketNumber, subject, portalLink, recipientName, oldStatus, newStatus,
}: StatusChangedEmailProps) {
  const ns = statusConfig[newStatus] ?? { label: newStatus, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const os = statusConfig[oldStatus] ?? { label: oldStatus, color: "text-gray-500", bg: "" };

  return (
    <Html>
      <Head />
      <Preview>{`Ticket #${ticketNumber} – Status: ${ns.label}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] py-8 px-4">
            <Section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <Heading className="text-2xl font-bold text-gray-900 m-0 mb-2">
                Status-Update
              </Heading>
              <Text className="text-gray-500 m-0 mb-6">
                Hallo {recipientName}, der Status Ihres Tickets hat sich geaendert.
              </Text>
              <Section className={`border rounded-lg p-4 mb-6 ${ns.bg}`}>
                <Text className="text-xs text-gray-500 m-0 mb-1">#{ticketNumber} – {subject}</Text>
                <Text className="text-sm m-0">
                  <span className="line-through text-gray-400">{os.label}</span>
                  {" → "}
                  <strong className={ns.color}>{ns.label}</strong>
                </Text>
              </Section>
              <Button
                href={portalLink}
                className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg text-sm no-underline block text-center"
              >
                Ticket ansehen
              </Button>
              <Hr className="border-gray-200 my-6" />
              <Text className="text-xs text-gray-400 m-0">{portalLink}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
