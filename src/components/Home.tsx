import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SavedPattern } from "../types/SavedPattern";
import {
  knittingParam,
  embroideryParam,
  bareIdFor,
  deletePattern,
  listPatterns,
  patternsChangedEvent,
  percentComplete,
  renamePattern,
} from "../helpers/pattern-storage";
import { embroideryPercent } from "../helpers/embroidery";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import NameDialog from "./ui/NameDialog";
import ProgressRing from "./ProgressRing";
import CelestialPlate from "./CelestialPlate";
import { useReveal } from "../useReveal";
import "./Home.css";

const formatSavedAt = (savedAt: string) =>
  new Date(savedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

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
  const knitted = percentComplete(pattern);
  const sewn = embroideryPercent(pattern);
  const started = knitted > 0;
  const knittingDone = knitted >= 100;
  const sewingDone = sewn >= 100;

  /*
   * One primary action, for whatever comes next: knit until the knitting is
   * done, then sew until the sewing is done, then look at it.
   */
  const next = knittingDone
    ? sewingDone
      ? { label: "See it", to: `/pattern/${id}` }
      : {
          label: sewn > 0 ? "Keep embroidering" : "Embroider the stars",
          to: `/pattern/${id}?${embroideryParam}=1`,
        }
    : {
        label: started ? "Keep knitting" : "Start knitting",
        to: `/pattern/${id}?${knittingParam}=1`,
      };

  return (
    <li
      ref={ref}
      className={`pattern-card reveal${shown ? " reveal-shown" : ""}`}
    >
      <div className="pattern-card-head">
        <div>
          <h3 className="pattern-name">{pattern.name ?? "Saved sky"}</h3>
          <div className="pattern-date">
            {sewingDone
              ? "Finished"
              : knittingDone
                ? "Knitted, sewing the stars"
                : formatSavedAt(pattern.savedAt)}
          </div>
        </div>
        <div className="pattern-rings">
          <ProgressRing
            percent={knitted}
            label={`${knitted.toFixed(0)}% knitted`}
          />
          {knittingDone && (
            <ProgressRing
              percent={sewn}
              label={`${sewn.toFixed(0)}% embroidered`}
            />
          )}
        </div>
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
        <Button variant="quiet" onClick={() => navigate(`/pattern/${id}`)}>
          Chart
        </Button>
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
      aside={<span className="masthead-aside">A celestial atlas</span>}
    >
      {/* The masthead already carries the site name, so the hero is the pitch. */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A moment · a place · a sky</p>
          <h1 className="hero-title">Knit the sky you stood under.</h1>
          <p className="hero-lede">
            Choose a night and a place. The stars that were overhead are
            charted onto a hat: knitted in three yarns, then the constellations
            sewn on in thread. You get a chart to knit from and a guide to sew
            from.
          </p>
          <div className="hero-actions">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/design")}
            >
              Chart your sky
            </Button>
          </div>
        </div>
        <CelestialPlate className="hero-plate" />
      </section>

      <RevealSection>
        <h2 className="section-heading">Your skies</h2>
        {savedPatterns.length === 0 ? (
          <div className="empty-state">
            <p>
              Nothing saved yet. Patterns you save live in this browser, on this
              device, so they will be here when you come back, but they do not
              travel with you.
            </p>
          </div>
        ) : (
          <ul className="pattern-list">
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
        title="Rename this sky"
        initialValue={renaming?.name ?? "Saved sky"}
        onConfirm={(name) => {
          if (renaming) renamePattern(renaming.id, name);
          setRenaming(null);
        }}
        onCancel={() => setRenaming(null)}
      />

      <Dialog
        open={deleting !== null}
        title="Delete this sky?"
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
