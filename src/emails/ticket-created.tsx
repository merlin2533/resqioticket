import {
  Body, Button, Container, Head, Heading, Hr,
  Html, Preview, Section, Text, Tailwind,
} from "@react-email/components";

interface TicketCreatedEmailProps {
  ticketNumber: number;
  subject: string;
  portalLink: string;
  recipientName: string;
  description?: string;
}

export default function TicketCreatedEmail({
  ticketNumber,
  subject,
  portalLink,
  recipientName,
  description,
}: TicketCreatedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Ticket #${ticketNumber} wurde erstellt – ${subject}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] py-8 px-4">
            <Section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
                <Text className="text-white font-bold text-lg m-0">RT</Text>
              </div>
              <Heading className="text-2xl font-bold text-gray-900 m-0 mb-2">
                Ticket erstellt
              </Heading>
              <Text className="text-gray-500 m-0 mb-6">
                Hallo {recipientName}, Ihr Ticket wurde erfolgreich angelegt.
              </Text>
              <Section className="bg-gray-50 rounded-lg p-4 mb-6">
                <Text className="text-xs text-gray-400 uppercase tracking-wider font-medium m-0 mb-1">
                  Ticket
                </Text>
                <Text className="text-sm font-semibold text-gray-900 m-0">
                  #{ticketNumber} – {subject}
                </Text>
                {description && (
                  <Text className="text-sm text-gray-600 m-0 mt-2 line-clamp-3">
                    {description.replace(/<[^>]+>/g, "").slice(0, 200)}…
                  </Text>
                )}
              </Section>
              <Button
                href={portalLink}
                className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg text-sm no-underline block text-center"
              >
                Ticket ansehen
              </Button>
              <Hr className="border-gray-200 my-6" />
              <Text className="text-xs text-gray-400 m-0">
                Sie koennen auf diese E-Mail antworten, um einen Kommentar hinzuzufuegen.
                Der Link zu Ihrem Ticket: {portalLink}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
