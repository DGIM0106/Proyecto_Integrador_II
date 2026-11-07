import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input: React.FC<InputProps> = ({ className = "", error, ...props }) => {
  return (
    <input
      className={`w-full px-3.5 py-2.5 bg-slate-900/90 border text-slate-100 placeholder-slate-500 text-sm rounded-xl transition-all duration-200 outline-none focus:ring-2 ${
        error
          ? "border-rose-500 focus:ring-rose-500/40"
          : "border-slate-700/80 focus:border-emerald-500 focus:ring-emerald-500/30"
      } ${className}`}
      {...props}
    />
  );
};

export default Input;

