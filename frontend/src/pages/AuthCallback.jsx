import supabase from "../lib/supabase";
import axios from "axios";
import { setUser } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const supUser = data?.user;
        if (!supUser?.email) {
          navigate("/", { replace: true });
          return;
        }

        const BASE =
          import.meta.env.VITE_BACKEND_URL ||
          import.meta.env.VITE_API_URL ||
          "http://localhost:4000";

        const res = await axios.get(`${BASE}/existing-user`, {
          params: { email: supUser.email },
        });

        if (res.data?.exists) {
          if (res.data.jwttoken)
            localStorage.setItem("token", res.data.jwttoken);
          if (res.data.user) setUser(res.data.user);
          navigate("/dashboard", { replace: true });
          return;
        }

        const signupRes = await axios.post(`${BASE}/signup`, {
          email: supUser.email,
          name: supUser.user_metadata?.full_name || supUser.email.split("@")[0],
        });
        if (signupRes.data?.jwttoken)
          localStorage.setItem("token", signupRes.data.jwttoken);
        if (signupRes.data?.user) setUser(signupRes.data.user);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        navigate("/", { replace: true });
      }
    };
    run();
  }, [navigate]);

  return null;
}
