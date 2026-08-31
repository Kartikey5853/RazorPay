import React, { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { cn } from "../../lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className?: string
  background: ReactNode
  Icon?: React.ElementType | string
  description?: ReactNode | string
  href?: string
  cta?: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl glass-panel shadow-sm transition-all duration-300",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-6">
      <div className="pointer-events-none z-10 flex flex-col gap-2 transition-all duration-300 group-hover:-translate-y-4">
        {Icon && (
          typeof Icon === 'string' ? (
             <span className="material-symbols-outlined text-4xl text-secondary mb-2">{Icon}</span>
          ) : (
             <Icon className="h-10 w-10 text-secondary mb-2" />
          )
        )}
        <h3 className="text-xl font-bold text-primary">
          {name}
        </h3>
        <div className="text-on-surface-variant font-medium text-sm mt-1">{description}</div>
      </div>

      {href && cta && (
        <div
          className={cn(
            "pointer-events-none absolute bottom-0 flex w-full translate-y-10 flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          )}
        >
          <a href={href} className="pointer-events-auto btn btn-outline bg-white border-transparent text-sm px-4 py-2 hover:bg-slate-50 flex items-center gap-1 shadow-sm">
            {cta}
            <span className="material-symbols-outlined text-sm ms-1">arrow_forward</span>
          </a>
        </div>
      )}
    </div>

    <div className="pointer-events-none absolute inset-0 transition-all duration-300 group-hover:bg-slate-50/30" />
  </div>
)

export { BentoCard, BentoGrid }
