import supabase from "../../lib/supabase";
import axios from "axios";
import { setToken, setUser } from "../../lib/auth";
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

        const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

        const res = await axios.get(`${BASE}/auth/existing-user`, {
          params: { email: supUser.email },
        });

        if (res.data?.exists) {
          if (res.data.jwttoken) setToken(res.data.jwttoken);
          if (res.data.user) setUser(res.data.user);

          if (res.data.user.role === "ADMIN") {
            navigate("/admin");
            return;
          } else {
            navigate("/dashboard");
            return;
          }
        }
        navigate("/resident-from", { replace: true });
      } catch (e) {
        navigate("/", { replace: true });
      }
    };
    run();
  }, [navigate]);

  return null;
}
