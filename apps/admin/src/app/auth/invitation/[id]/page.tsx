import AcceptInvitationPageComponent from "@repo/ui/auth/invitation/accept";

const InvitationPage = async ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = await params;
  return <AcceptInvitationPageComponent id={id} />;
};

export default InvitationPage;
