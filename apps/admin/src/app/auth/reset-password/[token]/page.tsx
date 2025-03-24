import NewPasswordForm from "@repo/ui/auth/password-reset/new-password-form";

const PasswordResetPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;
  return <NewPasswordForm token={token} />;
};

export default PasswordResetPage;
