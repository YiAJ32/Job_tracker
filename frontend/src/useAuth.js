import { useEffect, useRef, useState } from "react";
import {
  forgotPassword,
  getMe,
  getToken,
  login,
  onUnauthorized,
  register,
  resendCode,
  resetPassword,
  setToken,
  verifyEmail,
} from "./api";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));
  // La sesión se cerró sola porque el backend dejó de aceptar el token
  const [sessionExpired, setSessionExpired] = useState(false);

  const userRef = useRef(null);
  userRef.current = user;

  useEffect(() => {
    onUnauthorized(() => {
      // Al cargar la página con un token viejo no se avisa nada: simplemente no hay sesión
      if (!userRef.current) return;
      setUser(null);
      setSessionExpired(true);
    });
    return () => onUnauthorized(null);
  }, []);

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
    setSessionExpired(false);
  }

  return {
    user,
    checking,
    sessionExpired,
    login: async (data) => handleAuth(await login(data)),
    // El registro no inicia sesión: primero hay que confirmar el código que llega por correo
    register,
    verifyEmail: async (data) => handleAuth(await verifyEmail(data)),
    resendCode,
    forgotPassword,
    resetPassword: async (data) => handleAuth(await resetPassword(data)),
    // Después de editar el perfil, para que el encabezado y el menú muestren los datos nuevos
    updateUser: setUser,
    logout: () => {
      setToken(null);
      setUser(null);
      setSessionExpired(false);
    },
  };
}
