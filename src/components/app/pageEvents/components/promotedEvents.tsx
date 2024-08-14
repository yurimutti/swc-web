import { EventDialog } from '@/components/app/pageEvents/components/eventDialog'
import { Button } from '@/components/ui/button'
import { NextImage } from '@/components/ui/image'
import { PageSubTitle } from '@/components/ui/pageSubTitle'
import { SWCEvents } from '@/utils/shared/getSWCEvents'

interface PromotedEventsProps {
  events: SWCEvents
}

export function PromotedEvents({ events }: PromotedEventsProps) {
  const filteredPromotionalEvents = events.filter(event => !!event.data.promotedPositioning)

  const orderedPromotionalEvents = filteredPromotionalEvents.sort(
    (a, b) => a.data.promotedPositioning! - b.data.promotedPositioning!,
  )

  return (
    <section className="flex flex-col items-center gap-8">
      {orderedPromotionalEvents.map(event => (
        <div
          className="flex flex-col items-center gap-4 lg:flex-row lg:gap-6"
          key={event.data.slug}
        >
          <div className="relative h-[182px] min-w-[271px]">
            <NextImage
              alt={event.data.name}
              className="rounded-3xl object-cover object-center"
              fill
              sizes="(max-width: 640px) 100vw, 271px"
              src={event.data.image}
            />
          </div>

          <div className="grid justify-items-center gap-2 lg:justify-items-start">
            <PageSubTitle as="h3" className="text-bold font-sans text-base text-foreground">
              {event.data.name}
            </PageSubTitle>
            <p className="line-clamp-3 text-center font-mono text-base text-muted-foreground lg:text-left">
              {event.data.description}
            </p>

            <EventDialog
              event={event.data}
              trigger={
                <Button asChild className="mt-2 w-full lg:mt-4 lg:w-fit" variant="secondary">
                  <span>Learn more</span>
                </Button>
              }
              triggerClassName="w-fit"
            />
          </div>
        </div>
      ))}
    </section>
  )
}