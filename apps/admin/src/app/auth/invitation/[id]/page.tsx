import AcceptInvitationPageComponent from "@repo/ui/auth/invitation/accept/page";

const InvitationPage = ({ params: { id } }: { params: { id: string } }) => {
  return <AcceptInvitationPageComponent id={id} />;
};

export default InvitationPage;
