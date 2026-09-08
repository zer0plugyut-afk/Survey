import { useId, type CSSProperties, type ComponentType } from 'react'
import {
  IconBookOpen,
  IconCircleCheck,
  IconCircleQuestion,
  IconClipboardCheck,
  IconHouse,
  IconLock,
  IconMsgs,
  IconPaperPlane,
  IconPen,
  IconSparkle,
  IconTasks,
  IconUsers,
} from 'nucleo-glass'

type NucleoGlassIcon = ComponentType<{
  size?: number | string
  uniqueId?: string
  style?: CSSProperties
  className?: string
  title?: string
}>

/** Accent-tinted Nucleo Glass gradients (matches app terracotta). */
export const glassAccentStyle = {
  '--nc-gradient-1-color-1': '#c27f58',
  '--nc-gradient-1-color-2': '#8a4f2e',
  '--nc-gradient-2-color-1': '#eedacb',
  '--nc-gradient-2-color-2': '#d4b49a99',
  '--nc-light': '#ffffff',
} as CSSProperties

export const glassCoolStyle = {
  '--nc-gradient-1-color-1': '#5a7fa8',
  '--nc-gradient-1-color-2': '#2f5f9a',
  '--nc-gradient-2-color-1': '#d6e4f2',
  '--nc-gradient-2-color-2': '#a8c4e099',
  '--nc-light': '#ffffff',
} as CSSProperties

export const glassOkStyle = {
  '--nc-gradient-1-color-1': '#3d9b7a',
  '--nc-gradient-1-color-2': '#1f7a5c',
  '--nc-gradient-2-color-1': '#d4efe4',
  '--nc-gradient-2-color-2': '#9fd4be99',
  '--nc-light': '#ffffff',
} as CSSProperties

type Props = {
  icon: NucleoGlassIcon
  size?: number
  style?: CSSProperties
  className?: string
  title?: string
}

/** Always pass uniqueId so multiple glass icons on one page don't clash. */
export function GlassIcon({ icon: Icon, size = 24, style, className, title }: Props) {
  const uid = useId().replace(/:/g, '')
  return (
    <span className={className} title={title} style={{ display: 'inline-grid', lineHeight: 0 }}>
      <Icon size={size} uniqueId={uid} style={{ ...glassAccentStyle, ...style }} />
    </span>
  )
}

export const NavIcons = {
  home: IconHouse as NucleoGlassIcon,
  create: IconClipboardCheck as NucleoGlassIcon,
  respond: IconMsgs as NucleoGlassIcon,
}

export const SurveyIcons = {
  question: IconCircleQuestion as NucleoGlassIcon,
  likert: IconTasks as NucleoGlassIcon,
  yesno: IconCircleCheck as NucleoGlassIcon,
  pen: IconPen as NucleoGlassIcon,
  book: IconBookOpen as NucleoGlassIcon,
  users: IconUsers as NucleoGlassIcon,
  send: IconPaperPlane as NucleoGlassIcon,
  lock: IconLock as NucleoGlassIcon,
  sparkle: IconSparkle as NucleoGlassIcon,
}
