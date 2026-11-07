import React from "react";

interface AvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs font-semibold",
  md: "w-10 h-10 text-sm font-semibold",
  lg: "w-14 h-14 text-base font-bold",
};

const getAvatarBg = (name: string) => {
  const colors = [
    "bg-emerald-600 text-white",
    "bg-teal-600 text-white",
    "bg-cyan-600 text-white",
    "bg-indigo-600 text-white",
    "bg-amber-600 text-white",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

const Avatar: React.FC<AvatarProps> = ({
  name = "Usuario",
  size = "md",
  className = "",
}) => {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${getAvatarBg(
        name
      )} flex items-center justify-center select-none shadow-sm ring-2 ring-slate-800 ${className}`}
    >
      {initial}
    </div>
  );
};

export default Avatar;

