import PageHeading from "./PageHeading";
import SignInPrompt from "./SignInPrompt";

/**
 * A whole page that needs a signed-in user (D45: signed out, only the
 * leaderboard's standings show): the heading and the sign-in prompt.
 */
const SignInRequired: React.FC<{ heading: string; message: string }> = ({ heading, message }) => (
  <div className="pt-20">
    <div className="p-4 min-h-screen flex flex-col items-center">
      <PageHeading heading={heading} />
      <SignInPrompt message={message} />
    </div>
  </div>
);

export default SignInRequired;
