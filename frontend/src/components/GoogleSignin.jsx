import supabase from "../lib/supabase";

export default function GoogleSignin() {
  const handleGoogleSignin = async () => {
    const { user, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:5173/auth/callback",
      },
    });
  };

  return (
    <div>
      <button className="auth-btn" onClick={handleGoogleSignin}>
        Signin With Google
      </button>
    </div>
  );
}
