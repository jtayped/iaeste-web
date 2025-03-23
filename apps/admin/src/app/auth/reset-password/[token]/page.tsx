import NewPasswordForm from "@repo/ui/auth/password-reset/new-password-form";

const PasswordResetPage = ({
  params: { token },
}: {
  params: { token: string };
}) => {
  return <NewPasswordForm token={token} />;
};

export default PasswordResetPage;
