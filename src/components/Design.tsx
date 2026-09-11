import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HatDesign, SkyMoment, SkySource } from "../types/HatDesign";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import DestinationType from "../types/DestinationType";
import {
  DecreaseMethod,
  DesignProblem,
  validateDesign,
} from "../types/KnittingMachine";
import {
  designFromSearchParams,
  designToSearchParams,
} from "../helpers/design-url";
import { Gauge } from "../helpers/sizing";
import { readGauge } from "../helpers/gauge-preference";
import {
  daysInMonth,
  longitudeToRaHours,
  raHoursToLongitude,
  zenithFor,
} from "../helpers/celestial-coordinates";
import {
  findTimeZones,
  formatOffset,
  instantsForLocalTime,
  LocalInstant,
  validLocalTime,
} from "../helpers/time-zone-helper";
import SizeCalculator from "./SizeCalculator";
import InputField from "./InputField";
import PlaceSearch from "./PlaceSearch";
import ToggleAdvancedOptions from "./ToggleAdvancedOptions";
import ShareDesignLink from "./ShareDesignLink";
import PageLayout from "./ui/PageLayout";
import Button from "./ui/Button";
import NumberField from "./ui/NumberField";
import "./Design.css";

/*
 * Named skies. Polaris and the four stars of Crux, the two things people
 * most want on the crown of a hat.
 */
const polaris: GlobalCoordinates = { latitude: 89.26, longitude: 37.95 };
const crux: GlobalCoordinates = { latitude: -60, longitude: -173 };

type SkyMode = "moment" | "polaris" | "crux" | "point";

const sameCoordinates = (a: GlobalCoordinates, b: GlobalCoordinates) =>
  Math.abs(a.latitude - b.latitude) < 0.005 &&
  Math.abs(a.longitude - b.longitude) < 0.005;

/** Which way of choosing a sky a design was made with. */
const modeFor = (design: HatDesign): SkyMode => {
  if (design.source) return "moment";
  const { coordinates } = design.orientation;
  if (sameCoordinates(coordinates, polaris)) return "polaris";
  if (sameCoordinates(coordinates, crux)) return "crux";
  return "point";
};

const now = (): SkyMoment => {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
};

const problemFor = (
  problems: DesignProblem[],
  field: DesignProblem["field"]
) => problems.find((problem) => problem.field === field)?.message;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const Design: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * The design is read straight from the URL rather than mirrored into local
   * state. Keeping a copy meant an incoming link was overwritten by whatever
   * had been typed earlier, because the copy was only ever seeded once.
   */
  const design = useMemo(
    () => designFromSearchParams(searchParams),
    [searchParams]
  );
  const params = useMemo(() => designToSearchParams(design), [design]);

  const [mode, setMode] = useState<SkyMode>(() => modeFor(design));
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [gauge, setGauge] = useState<Gauge>(() => readGauge());
  const [placeLabel, setPlaceLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState<string | null>(null);

  // Fill in a bare /design URL so it is shareable without touching a field
  // first. Replace rather than push, so editing does not fill the back button.
  useEffect(() => {
    if (searchParams.toString() === params.toString()) return;
    setSearchParams(params, { replace: true });
  }, [searchParams, params, setSearchParams]);

  const problems = useMemo(
    () =>
      validateDesign(
        design.stitchesPerRow,
        design.numberOfRows,
        design.decreaseMethod
      ),
    [design]
  );

  const update = (changes: Partial<HatDesign>) =>
    setSearchParams(designToSearchParams({ ...design, ...changes }), {
      replace: true,
    });

  const updateOrientation = (changes: Partial<HatDesign["orientation"]>) =>
    update({ orientation: { ...design.orientation, ...changes } });

  const updateSource = (changes: Partial<SkySource>) =>
    update({
      source: {
        moment: design.source?.moment ?? now(),
        place: design.source?.place ?? { latitude: 0, longitude: 0 },
        ...design.source,
        ...changes,
      },
    });

  const chooseMode = (next: SkyMode) => {
    setMode(next);
    setPlaceLabel(null);
    switch (next) {
      case "moment":
        // Start from tonight, here-ish, so the fields are never blank.
        if (!design.source) {
          update({
            source: { moment: now(), place: { latitude: 0, longitude: 0 } },
            orientation: { ...design.orientation, targetDestination: "crown" },
          });
        }
        break;
      case "polaris":
        update({ source: undefined, orientation: { ...design.orientation, coordinates: polaris } });
        break;
      case "crux":
        update({ source: undefined, orientation: { ...design.orientation, coordinates: crux } });
        break;
      case "point":
        update({ source: undefined });
        break;
    }
  };

  /*
   * A night and a place become a point in the sky in three steps: the place
   * has a time zone (looked up lazily, from a file that is not loaded until
   * it is needed), the zone turns the clock time into an instant, and the
   * instant and place give the sky overhead. Each step is cached on the
   * design so the URL always carries the answer as well as the question.
   */
  const source = design.source;
  const placeKey = source ? `${source.place.latitude},${source.place.longitude}` : "";
  const [zoneLookup, setZoneLookup] = useState<{
    key: string;
    zones: string[];
    error?: string;
  }>();

  useEffect(() => {
    if (mode !== "moment" || !source) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findTimeZones(source.place)
        .then((zones) => {
          if (!cancelled) setZoneLookup({ key: placeKey, zones });
        })
        .catch((error: Error) => {
          if (!cancelled) setZoneLookup({ key: placeKey, zones: [], error: error.message });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, source, placeKey]);

  const zonesReady = zoneLookup?.key === placeKey;
  const zones = zonesReady ? zoneLookup.zones : [];
  const zone = source?.zone && zones.includes(source.zone) ? source.zone : zones[0];
  const momentValid = source ? validLocalTime(source.moment) : false;

  const instants = useMemo<{ list: LocalInstant[]; error: string }>(() => {
    if (!source || !momentValid || !zone) return { list: [], error: "" };
    try {
      const list = instantsForLocalTime(source.moment, zone);
      return {
        list,
        error: list.length
          ? ""
          : "That clock time never happened: the clocks went forward over it. Choose a time before or after the change.",
      };
    } catch {
      return { list: [], error: "This browser cannot work out the time zone. Try a newer one." };
    }
  }, [source, momentValid, zone]);

  const instant =
    instants.list[Math.min(source?.occurrence ?? 0, instants.list.length - 1)];

  // The sky overhead, once known, is written to the design as its orientation.
  useEffect(() => {
    if (mode !== "moment" || !source || !instant) return;
    const sky = zenithFor(instant.utc, source.place);
    const coordinates = { latitude: sky.dec, longitude: raHoursToLongitude(sky.ra) };
    if (sameCoordinates(coordinates, design.orientation.coordinates)) return;
    updateOrientation({ coordinates, targetDestination: "crown" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, source, instant]);

  const skyReady =
    mode !== "moment" || (!!source && momentValid && zonesReady && !!instant);

  const locate = () => {
    setLocating("Finding where you are…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateSource({
          place: {
            latitude: Math.round(position.coords.latitude * 100) / 100,
            longitude: Math.round(position.coords.longitude * 100) / 100,
          },
          zone: undefined,
        });
        setPlaceLabel("where you are now");
        setLocating(null);
      },
      () => setLocating("Your location is not available. Search for a place, or type its coordinates.")
    );
  };

  const handleKnitAndChart = () => {
    if (problems.length > 0) {
      setShowProblems(true);
      // The crown rule lives under the extra options, so open them to show
      // where the fix is.
      setShowAdvancedOptions(true);
      return;
    }
    if (!skyReady) return;
    navigate(`/render?${params.toString()}`);
  };

  const overhead = design.orientation.coordinates;

  return (
    <PageLayout
      title="Design your sky"
      step="design"
      lede="Say how big the head is, then which night and which place the sky is from."
    >
      <h2 className="design-section-heading">Size</h2>

      <SizeCalculator
        gauge={gauge}
        setGauge={setGauge}
        stitchesPerRow={design.stitchesPerRow}
        numberOfRows={design.numberOfRows}
        decreaseMethod={design.decreaseMethod}
        onSize={(stitchesPerRow, numberOfRows) => {
          setShowProblems(false);
          update({ stitchesPerRow, numberOfRows });
        }}
      />

      <div className="design-row">
        <InputField
          label="Stitches per row"
          value={design.stitchesPerRow}
          valueSetter={(stitchesPerRow) => update({ stitchesPerRow })}
          problem={showProblems ? problemFor(problems, "stitchesPerRow") : undefined}
        />
        <InputField
          label="Rows before the crown"
          value={design.numberOfRows}
          valueSetter={(numberOfRows) => update({ numberOfRows })}
          problem={showProblems ? problemFor(problems, "numberOfRows") : undefined}
        />
      </div>

      <h2 className="design-section-heading" style={{ marginTop: "22px" }}>
        The sky
      </h2>

      <div className="design-field">
        <label>
          <span className="design-field-label">Which sky</span>
          <select value={mode} onChange={(e) => chooseMode(e.target.value as SkyMode)}>
            <option value="moment">The sky over a place, on a night</option>
            <option value="polaris">The North Star, Polaris</option>
            <option value="crux">The Southern Cross</option>
            <option value="point">A point, by right ascension and declination</option>
          </select>
        </label>
      </div>

      {mode === "moment" && source && (
        <div className="sky-moment">
          <PlaceSearch
            onPick={(coordinates, place) => {
              updateSource({ place: coordinates, zone: undefined });
              setPlaceLabel(`${place.name}, ${place.region}`);
              setLocating(null);
            }}
          />
          <div className="design-row">
            <InputField
              label="Latitude"
              value={source.place.latitude}
              valueSetter={(latitude) => {
                updateSource({ place: { ...source.place, latitude }, zone: undefined });
                setPlaceLabel(null);
              }}
              min={-90}
              max={90}
              step={0.01}
            />
            <InputField
              label="Longitude"
              value={source.place.longitude}
              valueSetter={(longitude) => {
                updateSource({ place: { ...source.place, longitude }, zone: undefined });
                setPlaceLabel(null);
              }}
              min={-180}
              max={180}
              step={0.01}
            />
            <div className="design-field design-field-button">
              <Button variant="secondary" onClick={locate}>
                Where I am now
              </Button>
            </div>
          </div>
          {(placeLabel || locating) && (
            <p className="design-hint" style={{ marginTop: "-8px" }}>
              {locating ?? `Standing at ${placeLabel}.`}
            </p>
          )}

          <div className="design-row sky-clock">
            <label>
              <span className="design-field-label">Month</span>
              <select
                  value={source.moment.month}
                  onChange={(e) => {
                    const month = Number(e.target.value);
                    const day = Math.min(source.moment.day, daysInMonth(month, source.moment.year));
                    updateSource({ moment: { ...source.moment, month, day }, occurrence: undefined });
                  }}
                >
                {monthNames.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </label>
            <NumberField
              label="Day"
              value={source.moment.day}
              onChange={(day) => updateSource({ moment: { ...source.moment, day }, occurrence: undefined })}
              min={1}
              max={daysInMonth(source.moment.month, source.moment.year)}
              width="5rem"
            />
            <NumberField
              label="Year"
              value={source.moment.year}
              onChange={(year) => updateSource({ moment: { ...source.moment, year }, occurrence: undefined })}
              min={1900}
              max={2200}
              width="6rem"
            />
            <NumberField
              label="Hour"
              value={source.moment.hour}
              onChange={(hour) => updateSource({ moment: { ...source.moment, hour }, occurrence: undefined })}
              min={0}
              max={23}
              width="5rem"
            />
            <NumberField
              label="Minute"
              value={source.moment.minute}
              onChange={(minute) => updateSource({ moment: { ...source.moment, minute }, occurrence: undefined })}
              min={0}
              max={59}
              width="5rem"
            />
          </div>

          {!momentValid && (
            <p role="alert" className="design-problem">
              That is not a date and time on the calendar.
            </p>
          )}

          {zones.length > 1 && (
            <div className="design-field">
              <label>
                <span className="design-field-label">Whose clock</span>
                <select
                  value={zone}
                  onChange={(e) => updateSource({ zone: e.target.value, occurrence: undefined })}
                >
                  {zones.map((name) => (
                    <option key={name} value={name}>{name.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </label>
              <div className="design-hint">
                This place sits on a boundary between time zones. Choose the one the clock was set to.
              </div>
            </div>
          )}

          {instants.list.length > 1 && (
            <div className="design-field">
              <label>
                <span className="design-field-label">Which of the two</span>
                <select
                  value={source.occurrence ?? 0}
                  onChange={(e) => updateSource({ occurrence: Number(e.target.value) || undefined })}
                >
                  {instants.list.map((candidate, i) => (
                    <option key={candidate.timestamp} value={i}>
                      {i === 0 ? "Before the clocks went back" : "After the clocks went back"} ({formatOffset(candidate.offset)})
                    </option>
                  ))}
                </select>
              </label>
              <div className="design-hint">
                The clocks went back that night, so this time came round twice.
              </div>
            </div>
          )}

          <p className="design-hint sky-status" aria-live="polite">
            {!zonesReady
              ? "Working out the local time…"
              : zoneLookup?.error ||
                instants.error ||
                (instant && zone
                  ? `${zone.replace(/_/g, " ")}, ${formatOffset(instant.offset)} · overhead: right ascension ${longitudeToRaHours(overhead.longitude).toFixed(1)}h, declination ${overhead.latitude.toFixed(1)}°`
                  : "")}
          </p>
          <p className="design-hint design-credit">
            Time zones from the OpenStreetMap boundaries, © OpenStreetMap contributors.
          </p>
        </div>
      )}

      {mode === "point" && (
        <div className="design-row">
          <InputField
            label="Right ascension (hours)"
            value={longitudeToRaHours(overhead.longitude)}
            valueSetter={(hours) =>
              updateOrientation({ coordinates: { ...overhead, longitude: raHoursToLongitude(hours) } })
            }
            min={0}
            max={24}
            step={0.01}
          />
          <InputField
            label="Declination (degrees)"
            value={overhead.latitude}
            valueSetter={(latitude) => updateOrientation({ coordinates: { ...overhead, latitude } })}
            min={-90}
            max={90}
            step={0.01}
          />
        </div>
      )}

      {mode !== "moment" && (
        <p className="design-hint" style={{ marginTop: "-4px" }}>
          {mode === "polaris" && "Polaris sits at the crown; the sky turns around it."}
          {mode === "crux" && "The Southern Cross sits at the crown, with the Pointers beside it."}
          {mode === "point" && "That point in the sky sits wherever you put it below."}
        </p>
      )}

      <ToggleAdvancedOptions
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
      />

      <div
        className={`advanced-panel ${
          showAdvancedOptions ? "advanced-panel-open" : "advanced-panel-closed"
        }`}
      >
        <h2 className="design-section-heading" style={{ marginTop: "22px" }}>
          The stars
        </h2>

        <InputField
          label="Faintest star to knit (magnitude)"
          value={design.orientation.magnitudeLimit ?? 4}
          valueSetter={(magnitudeLimit) => updateOrientation({ magnitudeLimit })}
          min={0}
          max={6}
          step={0.5}
          hint="Bigger is fainter: 4 is what a town sky shows, 6 is the whole catalogue. A star a constellation passes through is always knitted."
        />

        {mode !== "moment" && (
          <div className="design-field">
            <label>
              <span className="design-field-label">Where that point sits on the hat</span>
              <select
                value={design.orientation.targetDestination}
                onChange={(e) =>
                  updateOrientation({ targetDestination: e.target.value as DestinationType })
                }
              >
                <option value="crown">At the crown</option>
                <option value="front">At the front</option>
                <option value="rim">At the rim</option>
              </select>
            </label>
          </div>
        )}

        <h2 className="design-section-heading" style={{ marginTop: "26px" }}>
          Shaping
        </h2>

        <div className="design-field">
          <label>
            <span className="design-field-label">Crown shape</span>
            <select
              value={design.decreaseMethod}
              onChange={(e) => update({ decreaseMethod: e.target.value as DecreaseMethod })}
            >
              <option value="Pyramidal">Pyramidal</option>
              <option value="Hemispherical">Rounded</option>
            </select>
          </label>
          <div className="design-hint">
            A pyramidal crown decreases in straight lines and needs a stitch
            count divisible by ten. A rounded one takes any even count.
          </div>
        </div>
      </div>

      <div className="design-actions">
        <Button
          variant="primary"
          size="lg"
          onClick={handleKnitAndChart}
          disabled={mode === "moment" && !skyReady}
        >
          Knit and chart
        </Button>
        <ShareDesignLink />
      </div>
    </PageLayout>
  );
};

export default Design;
