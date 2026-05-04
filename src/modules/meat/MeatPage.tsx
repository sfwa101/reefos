import BackHeader from "@/components/BackHeader";
import { storeThemes } from "@/lib/storeThemes";
import { useMeatLogic } from "./hooks/useMeatLogic";
import { MeatHero } from "./components/MeatHero";
import { MeatSearchBar } from "./components/MeatSearchBar";
import { MeatStickyNav } from "./components/MeatStickyNav";
import { MeatFeed } from "./components/MeatFeed";
import { NAV_OFFSETS } from "./types";

/**
 * MeatPage — Lego shell.
 * Composes hero + search + dual-tier sticky nav + continuous feed.
 * All state lives in `useMeatLogic`. All visuals are memoized children.
 */
const MeatPage = () => {
  const theme = storeThemes.meat;
  const {
    activeMain,
    activeSub,
    scrolled,
    query,
    setQuery,
    currentGroup,
    feed,
    tier2Ref,
    registerGroupRef,
    registerSectionRef,
    jumpToGroup,
    jumpToSub,
  } = useMeatLogic();

  return (
    <div>
      <BackHeader
        title="اللحوم والمجمدات"
        subtitle="طازجة بأعلى معايير الجودة والسلامة"
        accent="متجر"
        themeKey="meat"
      />

      <MeatHero gradient={theme.gradient} />
      <MeatSearchBar value={query} onChange={setQuery} />

      <MeatStickyNav
        activeMain={activeMain}
        activeSub={activeSub}
        scrolled={scrolled}
        currentGroup={currentGroup}
        themeHue={theme.hue}
        tier2Ref={tier2Ref}
        onJumpGroup={jumpToGroup}
        onJumpSub={jumpToSub}
      />

      {/* Spacer for the dual sticky bars */}
      <div style={{ height: NAV_OFFSETS.TIER1 + NAV_OFFSETS.TIER2 + 16 }} />

      <MeatFeed
        feed={feed}
        themeHue={theme.hue}
        registerGroupRef={registerGroupRef}
        registerSectionRef={registerSectionRef}
      />
    </div>
  );
};

export default MeatPage;
