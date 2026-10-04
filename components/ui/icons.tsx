// Inline SVG icon set: 24px grid, stroke 1.75, currentColor. Decorative by default
// (aria-hidden); label the enclosing button instead.
import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function make(name: string, paths: React.ReactNode) {
  function Icon({ size = 24, className, ...rest }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={`shrink-0 ${className ?? ""}`}
        {...rest}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = `${name}Icon`;
  return Icon;
}

export const CalendarIcon = make(
  "Calendar",
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
);

export const MapPinIcon = make(
  "MapPin",
  <>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);

export const BedIcon = make(
  "Bed",
  <>
    <path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6" />
    <circle cx="7" cy="11.5" r="1.75" />
  </>,
);

export const MapIcon = make(
  "Map",
  <>
    <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
    <path d="M9 4v14M15 6v14" />
  </>,
);

export const PlusIcon = make("Plus", <path d="M12 5v14M5 12h14" />);

export const ChevronLeftIcon = make("ChevronLeft", <path d="m15 5-7 7 7 7" />);
export const ChevronRightIcon = make("ChevronRight", <path d="m9 5 7 7-7 7" />);
export const ChevronDownIcon = make("ChevronDown", <path d="m5 9 7 7 7-7" />);
export const ChevronUpIcon = make("ChevronUp", <path d="m5 15 7-7 7 7" />);

export const NavigationIcon = make("Navigation", <path d="M20 4 3.5 10.8l7 2.7 2.7 7L20 4Z" />);

/** Road-sign diamond with a turn arrow: "get directions". */
export const DirectionsIcon = make(
  "Directions",
  <>
    <path d="M10.6 3.1a2 2 0 0 1 2.8 0l7.5 7.5a2 2 0 0 1 0 2.8l-7.5 7.5a2 2 0 0 1-2.8 0l-7.5-7.5a2 2 0 0 1 0-2.8l7.5-7.5Z" />
    <path d="M9 15v-2.5a2 2 0 0 1 2-2h4.5M13.5 8.5l2 2-2 2" />
  </>,
);

export const MoreIcon = make(
  "More",
  <>
    <circle cx="5.5" cy="12" r="1.1" fill="currentColor" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1.1" fill="currentColor" />
  </>,
);

export const PencilIcon = make(
  "Pencil",
  <>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </>,
);

export const TrashIcon = make(
  "Trash",
  <>
    <path d="M4 7h16M10 11v6M14 11v6M9 7V4.5h6V7" />
    <path d="M5.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5l1-12.5" />
  </>,
);

export const SearchIcon = make(
  "Search",
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.4-4.4" />
  </>,
);

export const XIcon = make("X", <path d="M6 6l12 12M18 6 6 18" />);

export const ClockIcon = make(
  "Clock",
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

export const NoteIcon = make(
  "Note",
  <>
    <path d="M14.5 3.5H7A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V8.5l-5-5Z" />
    <path d="M14.5 3.5v5h5M8.5 13h7M8.5 16.5h4.5" />
  </>,
);

export const GripIcon = make(
  "Grip",
  <>
    {[6, 12, 18].map((y) => (
      <g key={y}>
        <circle cx="9" cy={y} r="1" fill="currentColor" />
        <circle cx="15" cy={y} r="1" fill="currentColor" />
      </g>
    ))}
  </>,
);

export const TagIcon = make(
  "Tag",
  <>
    <path d="M3.5 12.1V4.5a1 1 0 0 1 1-1h7.6a1 1 0 0 1 .7.3l8 8a1.5 1.5 0 0 1 0 2.1l-7.2 7.2a1.5 1.5 0 0 1-2.1 0l-8-8a1 1 0 0 1-.3-.7Z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </>,
);

export const ExternalLinkIcon = make(
  "ExternalLink",
  <>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </>,
);

export const LogoutIcon = make(
  "Logout",
  <>
    <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" />
    <path d="M15 8l4 4-4 4M19 12H9.5" />
  </>,
);

export const LocateIcon = make(
  "Locate",
  <>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </>,
);
