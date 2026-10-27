import { useEffect, useState } from "react";
import { getMe, getToken, login, register, setToken } from "./api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function handleAuth(response) {
    setToken(response.token);
    setUser(response.user);
  }

  return {
    user,
    checking,
    login: async (data) => handleAuth(await login(data)),
    register: async (data) => handleAuth(await register(data)),
    // Después de editar el perfil, para que el encabezado y el menú muestren los datos nuevos
    updateUser: setUser,
    logout: () => {
      setToken(null);
      setUser(null);
    },
  };
}
