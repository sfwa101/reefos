import { memo } from "react";
import { MeatSubSection } from "./MeatSubSection";
import { NAV_OFFSETS } from "../types";
import type { MeatFeedGroup } from "../hooks/useMeatLogic";

interface Props {
  readonly feed: ReadonlyArray<MeatFeedGroup>;
  readonly themeHue: string;
  readonly registerGroupRef: (id: string) => (el: HTMLElement | null) => void;
  readonly registerSectionRef: (id: string) => (el: HTMLElement | null) => void;
}

const SCROLL_MARGIN =
  NAV_OFFSETS.HEADER_OFFSET + NAV_OFFSETS.TIER1 + NAV_OFFSETS.TIER2 + 8;

const MeatFeedComponent = ({
  feed,
  themeHue,
  registerGroupRef,
  registerSectionRef,
}: Props) => (
  <div className="space-y-10">
    {feed.map((g) => (
      <div
        key={g.id}
        ref={registerGroupRef(g.id)}
        data-group={g.id}
        style={{ scrollMarginTop: SCROLL_MARGIN }}
      >
        <h2 className="mb-4 flex items-center gap-2 px-1 font-display text-2xl font-extrabold text-foreground">
          <span
            className="inline-block h-6 w-1.5 rounded-full"
            style={{ background: `hsl(${themeHue})` }}
          />
          {g.name}
          <span className="text-xs font-bold text-muted-foreground">
            · {g.items.length}
          </span>
        </h2>

        <div className="space-y-8">
          {g.subs.map((s) => (
            <section
              key={`${g.id}-${s.id}`}
              ref={registerSectionRef(s.id)}
              data-sub-section={s.id}
              style={{ scrollMarginTop: SCROLL_MARGIN }}
            >
              <MeatSubSection subId={s.id} label={s.label} items={s.items} />
            </section>
          ))}
        </div>
      </div>
    ))}
    <div style={{ height: "60vh" }} />
  </div>
);

export const MeatFeed = memo(MeatFeedComponent);
