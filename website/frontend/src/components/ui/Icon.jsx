function IconSvg({ children, size = 20, strokeWidth = 2 }) {
  return (
    <svg
      aria-hidden="true"
      className="icon-svg"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth}>
        {children}
      </g>
    </svg>
  )
}

export default function Icon({ name, size = 20 }) {
  switch (name) {
    case 'bell':
      return (
        <IconSvg size={size}>
          <path d="M9 18h6" />
          <path d="M6.5 16.5h11l-1.3-1.8V10a4.2 4.2 0 1 0-8.4 0v4.7Z" />
        </IconSvg>
      )
    case 'dashboard':
      return (
        <IconSvg size={size}>
          <path d="M4 10.5 12 4l8 6.5" />
          <path d="M6.5 10v9h11v-9" />
        </IconSvg>
      )
    case 'groups':
      return (
        <IconSvg size={size}>
          <circle cx="9" cy="9" r="3" />
          <circle cx="16.5" cy="10.5" r="2.5" />
          <path d="M4.5 18c1.2-2.1 3-3 4.5-3s3.3.9 4.5 3" />
          <path d="M14 17.5c.7-1.4 1.7-2 3-2 1 0 2 .5 2.8 1.5" />
        </IconSvg>
      )
    case 'addExpense':
      return (
        <IconSvg size={size}>
          <rect height="14" rx="2.5" width="12" x="6" y="5" />
          <path d="M12 8v8" />
          <path d="M9 11h6" />
        </IconSvg>
      )
    case 'settle':
      return (
        <IconSvg size={size}>
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h7" />
          <path d="m16 15 2 2 3-4" />
        </IconSvg>
      )
    case 'groupVoting':
      return (
        <IconSvg size={size}>
          <rect height="12" rx="2" width="14" x="5" y="7" />
          <path d="m8.5 13 2 2 5-5" />
        </IconSvg>
      )
    case 'ai':
      return (
        <IconSvg size={size}>
          <rect height="10" rx="2" width="12" x="6" y="8" />
          <path d="M9 8V6" />
          <path d="M15 8V6" />
          <circle cx="10" cy="13" r=".7" fill="currentColor" stroke="none" />
          <circle cx="14" cy="13" r=".7" fill="currentColor" stroke="none" />
          <path d="M10 16h4" />
        </IconSvg>
      )
    case 'challenges':
      return (
        <IconSvg size={size}>
          <path d="M8 5h8v4a4 4 0 0 1-8 0Z" />
          <path d="M10 17h4" />
          <path d="M12 13v4" />
          <path d="M6 7H4a2 2 0 0 0 2 3" />
          <path d="M18 7h2a2 2 0 0 1-2 3" />
        </IconSvg>
      )
    case 'scanner':
      return (
        <IconSvg size={size}>
          <path d="M8 4H6a2 2 0 0 0-2 2v2" />
          <path d="M16 4h2a2 2 0 0 1 2 2v2" />
          <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
          <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
          <path d="M7 12h10" />
        </IconSvg>
      )
    case 'cart':
      return (
        <IconSvg size={size}>
          <circle cx="9" cy="19" r="1" />
          <circle cx="17" cy="19" r="1" />
          <path d="M4 5h2l2.2 9h8.9l2-7H7.3" />
        </IconSvg>
      )
    case 'burger':
      return (
        <IconSvg size={size}>
          <path d="M6 10a6 6 0 0 1 12 0" />
          <path d="M5 13h14" />
          <path d="M6 16h12" />
        </IconSvg>
      )
    case 'bulb':
      return (
        <IconSvg size={size}>
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M8.5 14.5A5 5 0 1 1 15.5 14.5c-.8.8-1.2 1.7-1.4 2.5h-4.2c-.2-.8-.6-1.7-1.4-2.5Z" />
        </IconSvg>
      )
    case 'chart':
      return (
        <IconSvg size={size}>
          <path d="M5 19V9" />
          <path d="M10 19V5" />
          <path d="M15 19v-7" />
          <path d="M20 19V8" />
        </IconSvg>
      )
    case 'pan':
      return (
        <IconSvg size={size}>
          <circle cx="10" cy="12" r="5" />
          <path d="M14.5 15.5 20 21" />
        </IconSvg>
      )
    case 'moneyBag':
      return (
        <IconSvg size={size}>
          <path d="m10 5 2-2 2 2" />
          <path d="M8 8h8" />
          <path d="M7 13a5 6 0 1 0 10 0c0-2-1-4-5-4s-5 2-5 4Z" />
          <path d="M12 11v5" />
          <path d="M10.5 12.5c.2-.6.8-1 1.5-1s1.3.4 1.5 1-.2 1.3-.9 1.6l-1.2.5c-.7.3-1 .9-.8 1.5.2.5.8.9 1.4.9.8 0 1.4-.4 1.6-1" />
        </IconSvg>
      )
    case 'couch':
      return (
        <IconSvg size={size}>
          <path d="M6 12V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
          <path d="M4 12v4" />
          <path d="M20 12v4" />
          <path d="M4 14h16" />
          <path d="M7 18v2" />
          <path d="M17 18v2" />
        </IconSvg>
      )
    case 'gamepad':
      return (
        <IconSvg size={size}>
          <path d="M7 10h10a3 3 0 0 1 2.8 4l-1.2 3.1a1.5 1.5 0 0 1-2.4.6l-2.2-1.7a3 3 0 0 0-4 0L7.8 17.7a1.5 1.5 0 0 1-2.4-.6L4.2 14A3 3 0 0 1 7 10Z" />
          <path d="M8 13h3" />
          <path d="M9.5 11.5v3" />
          <circle cx="15.5" cy="13" r=".8" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="11.5" r=".8" fill="currentColor" stroke="none" />
        </IconSvg>
      )
    default:
      return (
        <IconSvg size={size}>
          <circle cx="12" cy="12" r="8" />
        </IconSvg>
      )
  }
}
