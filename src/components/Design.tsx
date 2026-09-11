import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStitches } from "../helpers/stitches";
import { Stitch } from "../types/Stitch";
import {
  defaultNumberOfRows,
  defaultStitchesPerRow,
  northPole,
  southPole,
} from "../constants";
import DestinationType from "../types/DestinationType";
import { OrientationParameters } from "../types/OrientationParameters";
import { calculateUtc, DateTime } from "../helpers/time-zone-helper";
import { GlobalCoordinates } from "../types/GlobalCoordinates";
import {
  calculateRightAscensionAndDeclension,
  daysInMonth,
  raHoursToLongitude,
} from "../helpers/celestial-coordinates";
import InputField from "./InputField";
import {
  DecreaseMethod,
  DesignProblem,
  validateDesign,
} from "../types/KnittingMachine";
import CoordinatesInput from "./CoordinatesInput";
import ToggleAdvancedOptions from "./ToggleAdvancedOptions";
import "./Design.css";

interface PatternProps {
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  setOrientationParameters: React.Dispatch<
    React.SetStateAction<OrientationParameters>
  >;
}

type LocationType =
  | "Derived"
  | "North Star"
  | "Southern Cross"
  | "Current Location"
  | "Custom Location";

const Design: React.FC<PatternProps> = ({
  setStitches,
  orientationParameters,
  setOrientationParameters,
}) => {
  const navigate = useNavigate();

  const [stitchesPerRow, setStitchesPerRow] = useState(defaultStitchesPerRow);
  const [numberOfRows, setNumberOfRows] = useState(defaultNumberOfRows);
  const now = new Date();
  const [minute, setMinute] = useState<number | null>(now.getMinutes());
  const [hour, setHour] = useState<number | null>(now.getHours());
  const [day, setDay] = useState<number | null>(now.getDate());
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const [latitude, setLatitude] = useState<number | null>(0);
  const [longitude, setLongitude] = useState<number | null>(0);

  useEffect(() => {
    if (
      minute !== null &&
      hour !== null &&
      day !== null &&
      month !== null &&
      latitude !== null &&
      longitude !== null
    ) {
      const dateTime: DateTime = { day, month, hour, minute };
      const coordinates: GlobalCoordinates = { latitude, longitude };
      const utc = calculateUtc(dateTime, coordinates);
      const { ra, dec } = calculateRightAscensionAndDeclension(utc, {
        latitude,
        longitude,
      } as GlobalCoordinates);
      setOrientationParameters((prev) => ({
        ...prev,
        coordinates: {
          latitude: dec,
          longitude: raHoursToLongitude(ra),
        },
      }));
    }
  }, [minute, hour, day, month, latitude, longitude, setOrientationParameters]);

  const handleMinuteChange = (value: number | null) => {
    if (value === null || (value >= 0 && value < 60)) {
      setMinute(value);
    }
  };

  const handleHourChange = (value: number | null) => {
    if (value === null || (value >= 0 && value < 24)) {
      setHour(value);
    }
  };

  const lastDayOfMonth = daysInMonth(month ?? 1, now.getFullYear());

  const handleDayChange = (value: number | null) => {
    if (value === null || (value >= 1 && value <= lastDayOfMonth)) {
      setDay(value);
    }
  };

  const handleMonthChange = (value: number) => {
    if (value >= 1 && value <= 12) {
      setMonth(value);
      // The 31st of March is not the 31st of April.
      const last = daysInMonth(value, now.getFullYear());
      if (day !== null && day > last) setDay(last);
    }
  };

  const handleLatitudeChange = (value: number | null) => {
    if (value === null || (value >= -90 && value <= 90)) {
      setLatitude(value);
    }
  };

  const handleLongitudeChange = (value: number | null) => {
    if (value === null || (value >= -180 && value <= 180)) {
      setLongitude(value);
    }
  };

  const [locationType, setLocationType] = useState<LocationType>("Derived");
  const [decreaseMethod, setDecreaseMethod] =
    useState<DecreaseMethod>("Pyramidal");

  const handleDecreaseMethodChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setDecreaseMethod(e.target.value as DecreaseMethod);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLocation = e.target.value;
    setLocationType(selectedLocation as LocationType);

    switch (selectedLocation) {
      case "North Star":
        setOrientationParameters({
          ...orientationParameters,
          coordinates: northPole,
        });
        break;
      case "Southern Cross":
        setOrientationParameters({
          ...orientationParameters,
          coordinates: southPole,
        });
        break;
      case "Current Location":
        navigator.geolocation.getCurrentPosition((position) => {
          setOrientationParameters({
            ...orientationParameters,
            coordinates: {
              latitude: Number(position.coords.latitude.toFixed(1)),
              longitude: Number(position.coords.longitude.toFixed(1)),
            },
          });
        });
        break;
      case "Custom Location":
      default:
        break;
    }
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDestination = e.target.value;
    setOrientationParameters({
      ...orientationParameters,
      targetDestination: selectedDestination as DestinationType,
    });
  };

  // The machine's own rules, so the page cannot disagree with it.
  const problems = validateDesign(stitchesPerRow, numberOfRows, decreaseMethod);
  const problemWith = (field: DesignProblem["field"]) =>
    problems.find((problem) => problem.field === field)?.message;

  const handleViewAndColour = () => {
    if (problems.length > 0) return;
    setStitches(getStitches(stitchesPerRow, numberOfRows, decreaseMethod));
    navigate("/render");
  };

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <div className="design-container">
      <h1 className="design-h1">Design</h1>
      <h2 className="design-h2">Set Up Your Stitches</h2>
      <InputField
        label="Stitches per row"
        value={stitchesPerRow}
        valueSetter={setStitchesPerRow}
      />
      {problemWith("stitchesPerRow") && (
        <p className="design-problem" role="alert">
          {problemWith("stitchesPerRow")}
        </p>
      )}
      <InputField
        label="Number of rows before decreasing"
        value={numberOfRows}
        valueSetter={setNumberOfRows}
      />
      {problemWith("numberOfRows") && (
        <p className="design-problem" role="alert">
          {problemWith("numberOfRows")}
        </p>
      )}
      {locationType === "Derived" && (
        <>
          <h2 className="design-h2">Customise Your Night Sky</h2>
          Knit the night sky above your head at a specific time and place.
          <h3 className="design-h3">Choose a Date</h3>
          <div className="design-input-group">
            <label>
              Day
              <input
                type="number"
                min="1"
                max={lastDayOfMonth}
                step="1"
                value={day ?? ""}
                onChange={(e) =>
                  handleDayChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="design-input-number"
              />
            </label>
            <label>
              Month
              <select
                value={month ?? ""}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className="design-select"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </label>
          </div>
          <h3 className="design-h3">Choose a Time</h3>
          <div className="design-input-group">
            <label>
              Hour
              <input
                type="number"
                min="0"
                max="23"
                step="1"
                value={hour ?? ""}
                onChange={(e) =>
                  handleHourChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="design-input-number"
              />
            </label>
            <label>
              Minute
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={minute ?? ""}
                onChange={(e) =>
                  handleMinuteChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="design-input-number"
                style={{ marginLeft: "10px" }}
              />
            </label>
          </div>
          <h3 className="design-h3">Choose a Location</h3>
          <div style={{ marginBottom: "5px" }}>
            <label>
              Latitude
              <input
                type="number"
                value={latitude ?? ""}
                min="-90"
                max="90"
                step="0.1"
                onChange={(e) =>
                  handleLatitudeChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="design-input-number"
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                value={longitude ?? ""}
                min="-180"
                max="180"
                step="0.1"
                onChange={(e) =>
                  handleLongitudeChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="design-input-number"
                style={{ marginLeft: "10px" }}
              />
            </label>
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigator.geolocation.getCurrentPosition((position) => {
                setLatitude(Number(position.coords.latitude.toFixed(1)));
                setLongitude(Number(position.coords.longitude.toFixed(1)));
              });
            }}
            className="design-link"
          >
            Use current location
          </a>
        </>
      )}

      <div
        className={`advanced-options-container ${showAdvancedOptions
            ? "advanced-options-visible"
            : "advanced-options-hidden"
          }`}
      >
        <h2 className="design-h2">Decrease Method</h2>
        <h3 className="design-h3">Choose a Decrease Method</h3>
        <div className="design-input-group">
          <select value={decreaseMethod} onChange={handleDecreaseMethodChange}>
            <option value="Hemispherical">Hemispherical</option>
            <option value="Pyramidal">Pyramidal</option>
          </select>
        </div>
        <h2 className="design-h2">Orient Your Night Sky</h2>
        <h3 className="design-h3">Choose a Location</h3>
        <div className="design-input-group">
          <select value={locationType} onChange={handleLocationChange}>
            <option value="Derived">Derived From Place and Time</option>
            <option value="North Star">North Star (Polaris)</option>
            <option value="Southern Cross">Southern Cross (Crux)</option>
            <option value="Current Location">Current Location</option>
            <option value="Custom Location">Custom Location</option>
          </select>
        </div>
        <CoordinatesInput
          orientationParameters={orientationParameters}
          setOrientationParameters={setOrientationParameters}
          disabled={locationType !== "Custom Location"}
        />
        {locationType !== "Derived" && (
          <>
            <h3 className="design-h3">Where Should This Point End Up?</h3>
            <div className="design-input-group">
              <select
                value={orientationParameters.targetDestination}
                onChange={handleDestinationChange}
              >
                <option value="crown">The crown (top) of your hat</option>
                <option value="front">The front of your hat</option>
                <option value="rim">The rim (bottom) of your hat</option>
              </select>
            </div>
          </>
        )}
      </div>
      <ToggleAdvancedOptions
        showAdvancedOptions={showAdvancedOptions}
        setShowAdvancedOptions={setShowAdvancedOptions}
      />
      <br />
      <button className="knit-button" onClick={handleViewAndColour}>
        Knit and Dye
      </button>
    </div>
  );
};

export default Design;
