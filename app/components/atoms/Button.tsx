'use client'

import type { ReactNode, MouseEventHandler } from 'react'

// Här bestämmer vi vilka "utseenden" knappen får ha
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon' | 'link'

interface ButtonProps {
  children: ReactNode      // Texten eller ikonen inuti knappen
  onClick?: MouseEventHandler<HTMLButtonElement>
  variant?: ButtonVariant  // Vilken stil ska den ha?
  disabled?: boolean
  className?: string
  title?: string           // Text som syns när man hovrar (bra för ikoner)
  type?: 'button' | 'submit'
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', // Blå är standard om inget annat väljs
  disabled = false,
  className = '',
  title,
  type = 'button'
}: ButtonProps) {

  // 1. Grund-design (Gäller alla knappar)
  // focus:ring gör att man ser knappen tydligt om man använder tangentbord (EAA-krav)
  const baseStyles = "font-medium transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
  
  // 2. Våra olika "Skins"
  const variants = {
    primary: "bg-brand-green text-white hover:bg-brand-green/90 shadow-lg py-2 px-6 focus:ring-brand-green",
    secondary: "bg-black text-white hover:bg-gray-800 shadow-sm py-2 px-4 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 py-3 px-4 focus:ring-red-500",
    ghost: "bg-gray-100 text-gray-800 hover:bg-gray-200 py-3 px-4 focus:ring-gray-300", // För "Avbryt"
    icon: "text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full p-2 focus:ring-red-500", // För soptunnan
    link: "text-red-600 hover:text-red-800 underline text-sm p-0 bg-transparent focus:ring-red-500" // För "Logga ut"
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      // Här sätter vi ihop allt: Grund + Variant + Extra
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  )
}