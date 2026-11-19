import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SavedPattern } from "../types/SavedPattern";
import {
  embroideryParam,
  bareIdFor,
  deletePattern,
  listPatterns,
  patternsChangedEvent,
  renamePattern,
} from "../helpers/pattern-storage";
import { embroideryPercent } from "../helpers/embroidery";
import { useHatKnitting } from "../knitting/useHatKnitting";
import { chartPath, patternPath, percentKnitted } from "../knitting/paths";
import { positionOf, totals, whereYouAre } from "../reading/progress";
import { useKnittingTime } from "../ui/useKnittingTime";
import { TimeLine } from "../ui/components/KnittingTime";
import SkyThumb from "./SkyThumb";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import NameDialog from "./ui/NameDialog";
import { useReveal } from "../useReveal";
import { hatRoundOf } from "../helpers/brim";
import "./Home.css";

const formatSavedAt = (savedAt: string) =>
  new Date(savedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * The caption under a print: what was in the frame. Stitches by rounds, how
 * many stars landed on the hat, how many figures are drawn on it.
 */
const frameCaption = (pattern: SavedPattern, across: number, rounds: number) =>
  [
    `${across} × ${rounds}`,
    `${pattern.sky.stars.length} stars`,
    `${pattern.sky.constellations.length} figures`,
  ].join(" · ");

/** A section that rises into view the first time it is scrolled to. */
const RevealSection: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { ref, shown } = useReveal<HTMLElement>();
  return (
    <section ref={ref} className={`reveal${shown ? " reveal-shown" : ""}`}>
      {children}
    </section>
  );
};

const PatternCard: React.FC<{
  pattern: SavedPattern;
  onRename: () => void;
  onDelete: () => void;
}> = ({ pattern, onRename, onDelete }) => {
  const navigate = useNavigate();
  const { ref, shown } = useReveal<HTMLLIElement>();
  const id = bareIdFor(pattern.id);
  const reading = useHatKnitting(pattern.stitches);
  const position = positionOf(reading.stitches, pattern.progress, reading.index);
  const counts = totals(reading.index, pattern.progress);
  const time = useKnittingTime(pattern.id, reading.stitches, pattern.progress);
  const sewn = embroideryPercent(pattern);
  const started = counts.worked > 0;
  const knittingDone = position.finished;
  const sewingDone = sewn >= 100 || pattern.sky.constellations.length === 0;

  /*
   * One primary action, for whatever comes next: knit until the knitting is
   * done, then sew until the sewing is done, then look at it.
   */
  const next = knittingDone
    ? sewingDone
      ? { label: "See it", to: patternPath(id) }
      : {
          label: sewn > 0 ? "Keep tracing" : "Trace the figures",
          to: `${patternPath(id)}/chart?${embroideryParam}=1`,
        }
    : {
        label: started ? "Keep knitting" : "Start knitting",
        to: chartPath(id, true),
      };

  return (
    <li
      ref={ref}
      className={`frame reveal${shown ? " reveal-shown" : ""}`}
    >
      {/* The print itself: the sky the hat is a picture of, its figures joined up. */}
      <Link to={patternPath(id)} className="frame-print" aria-label={`Open ${pattern.name ?? "this sky"}`}>
        <SkyThumb hat={pattern.stitches} sky={pattern.sky} reading={reading} />
        <span className="frame-status">
          {knittingDone
            ? sewingDone
              ? "Finished"
              : `Knitted · ${Math.floor(sewn)}% traced`
            : started
              ? `${whereYouAre(position)} · ${percentKnitted(counts.worked, counts.percent)}`
              : "Not yet started"}
        </span>
      </Link>
      <div className="frame-caption">
        <h3 className="pattern-name">
          <Link to={patternPath(id)}>{pattern.name ?? "Saved sky"}</Link>
        </h3>
        <div className="readout">
          {frameCaption(
            pattern,
            // The sky's width: a brim casts on fewer.
            hatRoundOf(pattern.stitches) ?? reading.index.rounds[0]?.length ?? 0,
            reading.index.totalRounds,
          )}{" "}
          ·{" "}
          {formatSavedAt(pattern.savedAt)}
        </div>
        {time && <TimeLine time={time} finished={knittingDone} className="frame-time" />}
      </div>
      <div className="pattern-card-actions">
        <Button variant="primary" onClick={() => navigate(next.to)}>
          {next.label}
        </Button>
        <Button variant="secondary" onClick={() => navigate(`/render/${id}`)}>
          See the hat
        </Button>
      </div>
      {/* Housekeeping, on its own line under the two things you came for. */}
      <div className="pattern-card-admin">
        <Button variant="quiet" onClick={onRename}>
          Rename
        </Button>
        <Button variant="quiet" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  // Lazy initialiser: reading localStorage on every render is wasted work.
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>(() =>
    listPatterns()
  );
  const [renaming, setRenaming] = useState<SavedPattern | null>(null);
  const [deleting, setDeleting] = useState<SavedPattern | null>(null);

  const refresh = useCallback(() => setSavedPatterns(listPatterns()), []);

  useEffect(() => {
    window.addEventListener(patternsChangedEvent, refresh);
    // `storage` fires when another tab writes, which the custom event misses.
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(patternsChangedEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return (
    <PageLayout
      title="Hats Which Look Like Space"
      showTitle={false}
      aside={<span className="masthead-aside">A long exposure, knitted</span>}
    >
      {/*
       * The masthead already carries the site name, so the hero is the
       * pitch: one line of display type over the sky, like the title frame
       * of a planetarium show.
       */}
      <section className="hero">
        <p className="eyebrow">A place · a moment · a long exposure</p>
        <h1 className="hero-title">Knit the sky you stood under.</h1>
        <p className="hero-lede">
          Say where you were and when. The stars overhead that night are
          exposed onto a hat: knitted in three yarns, with the constellations
          traced over them in thread. You get a chart to knit from and a guide
          to sew from.
        </p>
        <div className="hero-actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate("/design")}
          >
            Frame your sky
          </Button>
          <span className="readout hero-readout">
            f/∞ · one night · three yarns
          </span>
        </div>
      </section>

      <RevealSection>
        <h2 className="section-heading">Your exposures</h2>
        {savedPatterns.length === 0 ? (
          <div className="empty-state">
            <p>
              Nothing in the frame yet. Skies you save are kept in this
              browser, on this device, so they will be here when you come
              back, but they do not travel with you.
            </p>
          </div>
        ) : (
          <ul className="gallery">
            {savedPatterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                onRename={() => setRenaming(pattern)}
                onDelete={() => setDeleting(pattern)}
              />
            ))}
          </ul>
        )}
      </RevealSection>

      <NameDialog
        open={renaming !== null}
        title="Rename this exposure"
        initialValue={renaming?.name ?? "Saved sky"}
        onConfirm={(name) => {
          if (renaming) renamePattern(renaming.id, name);
          setRenaming(null);
        }}
        onCancel={() => setRenaming(null)}
      />

      <Dialog
        open={deleting !== null}
        title="Delete this exposure?"
        text={
          <>
            {deleting?.name ?? "This pattern"} will be gone for good. Saved
            patterns are only in this browser, so there is no copy elsewhere.
          </>
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleting) deletePattern(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </PageLayout>
  );
};

export default Home;
