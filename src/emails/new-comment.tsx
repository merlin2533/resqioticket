import {
  Body, Button, Container, Head, Heading, Hr,
  Html, Preview, Section, Text, Tailwind,
} from "@react-email/components";

interface NewCommentEmailProps {
  ticketNumber: number;
  subject: string;
  portalLink: string;
  recipientName: string;
  commentAuthor: string;
  commentBody: string;
}

export default function NewCommentEmail({
  ticketNumber, subject, portalLink, recipientName, commentAuthor, commentBody,
}: NewCommentEmailProps) {
  const plainBody = commentBody.replace(/<[^>]+>/g, "").slice(0, 500);

  return (
    <Html>
      <Head />
      <Preview>{`Neue Antwort auf Ticket #${ticketNumber} von ${commentAuthor}`}</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[600px] py-8 px-4">
            <Section className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="w-10 h-10 bg-blue-600 rounded-lg mb-6">
                <Text className="text-white font-bold text-lg m-0 text-center leading-10">RT</Text>
              </div>
              <Heading className="text-2xl font-bold text-gray-900 m-0 mb-2">
                Neue Antwort
              </Heading>
              <Text className="text-gray-500 m-0 mb-1">
                Hallo {recipientName},
              </Text>
              <Text className="text-gray-500 m-0 mb-6">
                <strong>{commentAuthor}</strong> hat auf Ihr Ticket geantwortet.
              </Text>
              <Section className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4 mb-6">
                <Text className="text-xs text-blue-500 font-medium m-0 mb-2 uppercase tracking-wider">
                  #{ticketNumber} – {subject}
                </Text>
                <Text className="text-sm text-gray-800 m-0 whitespace-pre-wrap">
                  {plainBody}
                </Text>
              </Section>
              <Button
                href={portalLink}
                className="bg-blue-600 text-white font-medium px-6 py-3 rounded-lg text-sm no-underline block text-center"
              >
                Antworten
              </Button>
              <Hr className="border-gray-200 my-6" />
              <Text className="text-xs text-gray-400 m-0">
                Direkt antworten unter: {portalLink}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
