import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { defaultHatDesign } from "../types/HatDesign";
import {
  designFromSearchParams,
  designToSearchParams,
} from "../helpers/design-url";
import { readGauge } from "../helpers/gauge-preference";
import {
  daysInMonth,
  raHoursToLongitude,
  longitudeToRaHours,
  zenithFor,
} from "../helpers/celestial-coordinates";
import {
  findTimeZones,
  formatOffset,
  instantsForLocalTime,
  validLocalTime,
} from "../helpers/time-zone-helper";
import { DecreaseMethod, validateDesign } from "../types/KnittingMachine";
import SizeCalculator from "./SizeCalculator";
import NumberField from "./ui/NumberField";
import Button from "./ui/Button";
import "./Design.css";

export default function Design() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [design, setDesign] = useState(() =>
    designFromSearchParams(params, defaultHatDesign),
  );
  const [gauge, setGauge] = useState(readGauge);
  const [mode, setMode] = useState(params.size ? "custom" : "moment");
  const [moment, setMoment] = useState(() => {
    const d = new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
    };
  });
  const [place, setPlace] = useState({ latitude: 0, longitude: 0 });
  const placeKey = `${place.latitude},${place.longitude}`;
  const [zoneResult, setZoneResult] = useState<{
    key: string;
    zones: string[];
    error?: string;
  }>();
  const [chosenZone, setChosenZone] = useState("");
  const [occurrence, setOccurrence] = useState(0);
  const [retry, setRetry] = useState(0);
  const [problem, setProblem] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const zoneBusy = mode === "moment" && zoneResult?.key !== placeKey;
  const zones = zoneResult?.key === placeKey ? zoneResult.zones : [];
  const zone = zones.includes(chosenZone) ? chosenZone : zones[0];
  const validMoment = validLocalTime(moment);
  const time = useMemo(() => {
    if (!validMoment || !zone) return { instants: [], error: "" };
    try {
      const instants = instantsForLocalTime(moment, zone);
      return {
        instants,
        error: instants.length
          ? ""
          : "This local time was skipped when the clocks moved forward. Choose a time before or after the clock change.",
      };
    } catch {
      return {
        instants: [],
        error:
          "Your browser cannot read this time zone. Please update your browser and retry.",
      };
    }
  }, [moment, zone, validMoment]);
  const instant = time.instants[Math.min(occurrence, time.instants.length - 1)];
  useEffect(() => {
    if (mode !== "moment") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      findTimeZones(place)
        .then((zones) => {
          if (!cancelled) setZoneResult({ key: placeKey, zones });
        })
        .catch((error) => {
          if (!cancelled)
            setZoneResult({
              key: placeKey,
              zones: [],
              error: String(error.message),
            });
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [place, placeKey, mode, retry]);
  const errors = validateDesign(
    design.stitchesPerRow,
    design.numberOfRows,
    design.decreaseMethod,
  );
  const chart = () => {
    if (
      errors.length ||
      (mode === "moment" && (!validMoment || zoneBusy || !instant))
    )
      return;
    let orientation = design.orientation;
    if (mode === "moment") {
      const sky = zenithFor(instant!.utc, place);
      orientation = {
        ...orientation,
        coordinates: {
          latitude: sky.dec,
          longitude: raHoursToLongitude(sky.ra),
        },
        targetDestination: "crown",
      };
    }
    navigate(`/render?${designToSearchParams({ ...design, orientation })}`);
  };
  const skyPoint = (latitude: number, longitude: number) =>
    setDesign({
      ...design,
      orientation: {
        ...design.orientation,
        coordinates: { latitude, longitude },
      },
    });
  const locate = () =>
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPlace({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setProblem("");
      },
      () => setProblem("Location unavailable. Enter latitude and longitude."),
    );
  return (
    <main className="design-container page">
      <a href="#/" className="eyebrow">
        Hats which look like space
      </a>
      <h1>Your patch of sky</h1>
      <p>A moment overhead, translated into stitches.</p>
      <SizeCalculator
        gauge={gauge}
        setGauge={setGauge}
        stitchesPerRow={design.stitchesPerRow}
        numberOfRows={design.numberOfRows}
        decreaseMethod={design.decreaseMethod}
        onSize={(stitchesPerRow, numberOfRows) =>
          setDesign({ ...design, stitchesPerRow, numberOfRows })
        }
      />
      <section className="design-card">
        <h2>The sky to remember</h2>
        <label>
          Choose your sky
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              if (e.target.value === "polaris") skyPoint(89.26, 37.95);
              if (e.target.value === "crux") skyPoint(-60, -173);
            }}
          >
            <option value="moment">A place and moment</option>
            <option value="polaris">North Star (Polaris)</option>
            <option value="crux">Southern Cross (Crux)</option>
            <option value="custom">Right ascension and declination</option>
          </select>
        </label>
        {mode === "moment" ? (
          <>
            <div className="design-row">
              {(["year", "month", "day", "hour", "minute"] as const).map(
                (field) => (
                  <NumberField
                    key={field}
                    label={field[0].toUpperCase() + field.slice(1)}
                    value={moment[field]}
                    onChange={(value) => {
                      setMoment({ ...moment, [field]: value });
                      setOccurrence(0);
                    }}
                    min={
                      field === "year"
                        ? 1900
                        : field === "month" || field === "day"
                          ? 1
                          : 0
                    }
                    max={
                      field === "year"
                        ? 2100
                        : field === "month"
                          ? 12
                          : field === "day"
                            ? daysInMonth(moment.month, moment.year)
                            : field === "hour"
                              ? 23
                              : 59
                    }
                  />
                ),
              )}
            </div>
            {!validMoment && (
              <p role="alert">Enter a valid calendar date and time.</p>
            )}
            <div className="design-row">
              <NumberField
                label="Latitude"
                value={place.latitude}
                onChange={(latitude) => setPlace({ ...place, latitude })}
                min={-90}
                max={90}
                step={0.01}
              />
              <NumberField
                label="Longitude"
                value={place.longitude}
                onChange={(longitude) => setPlace({ ...place, longitude })}
                min={-180}
                max={180}
                step={0.01}
              />
            </div>
            <Button variant="quiet" onClick={locate}>
              Use current location
            </Button>
            <p>
              <a href="data-credits.html" target="_blank" rel="noreferrer">
                Time-zone map: © OpenStreetMap contributors
              </a>
            </p>
            <p>
              Enter the local clock time at this place. Daylight saving is
              included automatically for your chosen date.
            </p>
            {zone && (
              <p className="zone-status" aria-live="polite">
                {zone.replace(/_/g, " ")}
                {instant ? ` · ${formatOffset(instant.offset)}` : ""}
              </p>
            )}
            {zones.length > 1 && (
              <label>
                Time zone at this location
                <select
                  value={zone}
                  onChange={(e) => {
                    setChosenZone(e.target.value);
                    setOccurrence(0);
                  }}
                >
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <span>
                  This location lies on overlapping time-zone boundaries. Choose
                  the place whose clock you used.
                </span>
              </label>
            )}
            {time.instants.length > 1 && (
              <label>
                The clocks moved back, so this time happened twice.
                <select
                  value={occurrence}
                  onChange={(e) => setOccurrence(Number(e.target.value))}
                >
                  {time.instants.map((candidate, i) => (
                    <option key={candidate.timestamp} value={i}>
                      {i === 0
                        ? "First occurrence, before the clocks moved back"
                        : "Second occurrence, after the clocks moved back"}{" "}
                      ({formatOffset(candidate.offset)})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p role="status">
              {zoneBusy
                ? "Finding the local time zone…"
                : zoneResult?.error || time.error || problem}
            </p>
            {zoneResult?.error && !zoneBusy && (
              <Button
                onClick={() => {
                  setZoneResult(undefined);
                  setRetry(retry + 1);
                }}
              >
                Retry time-zone lookup
              </Button>
            )}
          </>
        ) : (
          <div className="design-row">
            <NumberField
              label="Right ascension (hours)"
              value={longitudeToRaHours(
                design.orientation.coordinates.longitude,
              )}
              onChange={(v) =>
                skyPoint(
                  design.orientation.coordinates.latitude,
                  raHoursToLongitude(v),
                )
              }
              min={0}
              max={24}
              step={0.01}
            />
            <NumberField
              label="Declination (degrees)"
              value={design.orientation.coordinates.latitude}
              onChange={(v) =>
                skyPoint(v, design.orientation.coordinates.longitude)
              }
              min={-90}
              max={90}
              step={0.01}
            />
          </div>
        )}
      </section>
      <Button
        variant="quiet"
        aria-expanded={advanced}
        onClick={() => setAdvanced(!advanced)}
      >
        Stitches and sky detail
      </Button>
      {advanced && (
        <section className="design-card">
          <div className="design-row">
            <NumberField
              label="Stitches per row"
              value={design.stitchesPerRow}
              onChange={(stitchesPerRow) =>
                setDesign({ ...design, stitchesPerRow })
              }
            />
            <NumberField
              label="Rows before decreasing"
              value={design.numberOfRows}
              onChange={(numberOfRows) =>
                setDesign({ ...design, numberOfRows })
              }
            />
          </div>
          <label>
            Crown shaping
            <select
              value={design.decreaseMethod}
              onChange={(e) =>
                setDesign({
                  ...design,
                  decreaseMethod: e.target.value as DecreaseMethod,
                })
              }
            >
              <option>Pyramidal</option>
              <option>Hemispherical</option>
            </select>
          </label>
          <NumberField
            label="Star magnitude limit"
            value={design.orientation.magnitudeLimit ?? 4}
            onChange={(magnitudeLimit) =>
              setDesign({
                ...design,
                orientation: { ...design.orientation, magnitudeLimit },
              })
            }
            min={0}
            max={6}
            step={0.5}
          />
          <p>
            A higher limit includes fainter stars. Constellation endpoints
            always remain visible. Stars use one white yarn.
          </p>
          {mode !== "moment" && (
            <label>
              Place this point at
              <select
                value={design.orientation.targetDestination}
                onChange={(e) =>
                  setDesign({
                    ...design,
                    orientation: {
                      ...design.orientation,
                      targetDestination: e.target.value as
                        "crown" | "front" | "rim",
                    },
                  })
                }
              >
                <option value="crown">Crown</option>
                <option value="front">Front</option>
                <option value="rim">Rim</option>
              </select>
            </label>
          )}
        </section>
      )}
      {errors.map((e) => (
        <p role="alert" key={e.field}>
          {e.message}
        </p>
      ))}
      <Button
        variant="primary"
        onClick={chart}
        disabled={
          errors.length > 0 ||
          (mode === "moment" && (!validMoment || zoneBusy || !instant))
        }
      >
        Knit and chart
      </Button>
    </main>
  );
}
