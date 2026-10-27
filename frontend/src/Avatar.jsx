import { useState } from "react";
import { photoUrl } from "./api";

export function initials(nombre) {
  return (nombre ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// Foto del usuario o, si no tiene (o no carga), sus iniciales
function Avatar({ user, src, size = "md" }) {
  const url = src ?? photoUrl(user?.foto_url);
  const [failedUrl, setFailedUrl] = useState(null);
  const className = size === "md" ? "avatar" : `avatar avatar-${size}`;

  if (url && failedUrl !== url) {
    return (
      <img
        className={`${className} avatar-photo`}
        src={url}
        alt=""
        aria-hidden="true"
        onError={() => setFailedUrl(url)}
      />
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {initials(user?.nombre)}
    </span>
  );
}

export default Avatar;
