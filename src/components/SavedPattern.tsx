import React, { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { SavedPattern as Pattern } from "../types/SavedPattern";
import {
  bareIdFor,
  deletePattern,
  embroideryParam,
  knittingParam,
  renamePattern,
} from "../helpers/pattern-storage";
import { completedSegments, sewingGroups } from "../helpers/embroidery";
import { useSavedPattern } from "../knitting/useSavedPattern";
import { useHatKnitting, type HatReading } from "../knitting/useHatKnitting";
import { aboutMetres, woolNeeded } from "../knitting/wool";
import { chartPath, patternPath, percentKnitted, statsParam } from "../knitting/paths";
import { positionOf, totals, whereYouAre } from "../reading/progress";
import { yarnFor } from "../reading/palette";
import { TimeFigures } from "../ui/components/KnittingTime";
import { useKnittingTime } from "../ui/useKnittingTime";
import HatChart from "./HatChart";
import ChartActions from "./ChartActions";
import ChartPrintSheet from "./ChartPrintSheet";
import ConstellationIndex from "./ConstellationIndex";
import YarnChoicesEditor from "./YarnChoices";
import YarnShoppingList from "./YarnShoppingList";
import WrittenInstructions from "./WrittenInstructions";
import FinishedBanner from "./FinishedBanner";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import Dialog from "./ui/Dialog";
import NameDialog from "./ui/NameDialog";
import { useYarns } from "../useYarns";
import "./KnitScreen.css";
import "./SavedPattern.css";

/** The chart page open on sewing. */
const sewingPath = (id: string) => `${patternPath(id)}/chart?${embroideryParam}=1`;

/**
 * A saved sky: how far it is knitted and traced and how long that took,
 * where the knitting is on the chart, the wool it takes, and the way back to
 * the needles - which is the one thing in the bar along the foot.
 *
 * The chart itself, the knitting and the sewing are a page of their own
 * (KnitChart): the chart there fills the screen, as it needs to on a phone.
 */
const SavedPattern: React.FC = () => {
  const { patternId } = useParams();
  const [params] = useSearchParams();
  const { pattern } = useSavedPattern(patternId);
  const navigate = useNavigate();

  if (!pattern) {
    return (
      <PageLayout title="Exposure not found">
        <p>
          This exposure is no longer saved in this browser. Saved exposures live
          only on the device that made them.
        </p>
        <Button variant="primary" onClick={() => navigate("/")}>
          Back to your exposures
        </Button>
      </PageLayout>
    );
  }

  // Knitting and sewing happen on the chart's own page; an old link that asked for them here is sent there.
  if (params.get(knittingParam) === "1") return <Navigate to={chartPath(pattern.id, true)} replace />;
  if (params.get(embroideryParam) === "1") return <Navigate to={sewingPath(pattern.id)} replace />;

  return <SkyPage pattern={pattern} />;
};

/** Each yarn: what it is called, how many stitches it knits, and about how much of it to have. */
const WoolTable: React.FC<{ reading: HatReading }> = ({ reading }) => {
  const wool = useMemo(() => woolNeeded(reading.stitches, reading.rounds), [reading.stitches, reading.rounds]);
  return (
    <ul className="wool-table">
      {wool.map(({ slot, stitches, metres }) => {
        const yarn = yarnFor(reading.palette, slot);
        return (
          <li key={slot}>
            <span className="wool-swatch" style={{ background: yarn.hex }} aria-hidden="true" />
            <span className="wool-name">
              <strong>{yarn.name}</strong>
              <span className="quiet">{stitches.toLocaleString()} stitches</span>
            </span>
            <span className="wool-metres">{aboutMetres(metres)}</span>
          </li>
        );
      })}
    </ul>
  );
};

const SkyPage: React.FC<{ pattern: Pattern }> = ({ pattern }) => {
  const navigate = useNavigate();
  const { yarns, setYarns } = useYarns();
  const reading = useHatKnitting(pattern.stitches);
  const { stitches, index } = reading;
  const position = positionOf(stitches, pattern.progress, index);
  const counts = totals(index, pattern.progress);
  const time = useKnittingTime(pattern.id, stitches, pattern.progress);
  const groups = useMemo(() => sewingGroups(pattern.sky, pattern.stitches), [pattern.sky, pattern.stitches]);
  const lines = groups.reduce((total, group) => total + group.segments.length, 0);
  const sewn = useMemo(() => completedSegments(groups, pattern.embroidery).size, [groups, pattern.embroidery]);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const name = pattern.name ?? "Saved sky";
  const knitted = position.finished;
  const traced = lines === 0 || sewn >= lines;
  const where = knitted ? (traced ? "Finished" : `${sewn} of ${lines} lines traced`) : whereYouAre(position);
  const percent = knitted ? "100%" : percentKnitted(counts.worked, counts.percent);

  return (
    <PageLayout
      title={name}
      step="pattern"
      lede={`Cast on ${index.rounds[0]?.length ?? 0}, and knitted ${index.totalRounds} rounds to the crown: ${counts.total.toLocaleString()} stitches, and ${pattern.sky.stars.length.toLocaleString()} stars.`}
      className="hat-page"
    >
      {knitted && <FinishedBanner stitches={counts.total} sewn={traced} />}

      <div className="hat-sections screen-only">
        <section className="hat-section hat-progress" aria-label="Your progress">
          <p className="hat-progress-figure">
            <em>{percent}</em>
            <span className="quiet">
              knitted · {counts.worked.toLocaleString()} of {counts.total.toLocaleString()} stitches
              {knitted ? "" : ` · ${counts.remaining.toLocaleString()} to go`}
            </span>
            <span className="hat-track" aria-hidden="true">
              <span style={{ width: `${counts.percent}%` }} />
            </span>
          </p>
          {lines > 0 && (
            <p className="hat-progress-figure hat-progress-sewn">
              <span className="quiet">
                Traced · {sewn} of {lines} lines of {groups.length}{" "}
                {groups.length === 1 ? "constellation" : "constellations"}
              </span>
              <span className="hat-track" aria-hidden="true">
                <span style={{ width: `${(100 * sewn) / lines}%` }} />
              </span>
            </p>
          )}
          {/* The chart where the knitting is, to say where that is; the whole of it is a tap away. */}
          <Link to={chartPath(pattern.id)} className="chart-window" aria-label="Look around the chart">
            <div className="chart-fills" {...{ inert: "" }}>
              <section className="chart-page">
                <HatChart hat={pattern.stitches} sky={pattern.sky} reading={reading} progress={pattern.progress} follow />
              </section>
            </div>
            <span className="chart-window-label">
              <strong>{knitted ? "Knitted" : whereYouAre(position)}</strong>
              <span className="quiet">Look around the chart</span>
            </span>
          </Link>
          {time ? (
            <>
              <dl className="hat-figures">
                <TimeFigures time={time} finished={knitted} />
              </dl>
              <p className="hat-more">
                <Link to={`${chartPath(pattern.id)}?${statsParam}=1`}>See your time on the chart</Link>
              </p>
            </>
          ) : (
            <p className="quiet hat-more">
              Knit from the chart and it keeps time for you: how long the hat
              has taken, and once there is enough to go on, how long it has left.
            </p>
          )}
        </section>

        <section className="hat-section" aria-labelledby="wool-heading">
          <h2 id="wool-heading" className="hat-section-title">
            Wool
          </h2>
          <WoolTable reading={reading} />
          <p className="quiet hat-small">
            Estimated from the stitches for double knitting, with a tenth more
            for tails and tension; keep some extra for the embroidery.
          </p>
          <YarnShoppingList stitches={pattern.stitches} />
          <YarnChoicesEditor yarns={yarns} setYarns={setYarns} />
        </section>

        <section className="hat-section" aria-labelledby="more-heading">
          <h2 id="more-heading" className="hat-section-title">
            The pattern
          </h2>
          <ConstellationIndex sky={pattern.sky} />
          <WrittenInstructions stitches={pattern.stitches} />
          <ChartActions stitches={pattern.stitches} sky={pattern.sky} name={name} />
          <div className="hat-manage">
            <Button variant="quiet" onClick={() => navigate(`/render/${bareIdFor(pattern.id)}`)}>
              See the hat
            </Button>
            {!knitted && lines > 0 && (
              <Button variant="quiet" onClick={() => navigate(sewingPath(pattern.id))}>
                Trace early
              </Button>
            )}
            <Button variant="quiet" onClick={() => setRenaming(true)}>
              Rename
            </Button>
            <Button variant="quiet" onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </div>
        </section>
      </div>

      <section className="stage-bar hat-bar screen-only" aria-label="Knit">
        <div className="stage-bar-text">
          <strong>{where}</strong>
          <span className="quiet">{percent} knitted</span>
        </div>
        {knitted && !traced ? (
          <Button variant="primary" onClick={() => navigate(sewingPath(pattern.id))}>
            {sewn > 0 ? "Keep tracing" : "Trace the figures"}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => navigate(knitted ? chartPath(pattern.id) : chartPath(pattern.id, true))}>
            {knitted ? "See the chart" : counts.worked > 0 ? "Keep knitting" : "Start knitting"}
          </Button>
        )}
      </section>

      <ChartPrintSheet stitches={pattern.stitches} sky={pattern.sky} title={name} />

      <NameDialog
        open={renaming}
        title="Rename this exposure"
        initialValue={name}
        onConfirm={(next) => {
          renamePattern(pattern.id, next);
          setRenaming(false);
        }}
        onCancel={() => setRenaming(false)}
      />
      <Dialog
        open={deleting}
        title="Delete this exposure?"
        text={
          <>
            {name} will be gone for good, and the time it took with it. Saved
            exposures are only in this browser, so there is no copy elsewhere.
          </>
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => {
          deletePattern(pattern.id);
          navigate("/");
        }}
        onCancel={() => setDeleting(false)}
      />
    </PageLayout>
  );
};

export default SavedPattern;
