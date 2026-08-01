import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"

import { cn } from "@workspace/ui/lib/utils"

function Accordion({ ...props }: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium text-foreground transition-colors outline-none hover:text-muted-foreground focus-visible:text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
        <HugeiconsIcon
          icon={PlusSignIcon}
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out-expo group-data-panel-open:rotate-45"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className={cn(
        "h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out-expo data-ending-style:h-0 data-starting-style:h-0",
        className
      )}
      {...props}
    >
      <div className="pb-5 text-muted-foreground">{children}</div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
