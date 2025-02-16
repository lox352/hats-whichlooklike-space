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
import { calculateRightAscensionAndDeclension } from "../helpers/celestial-coordinates";

interface PatternProps {
  setStitches: React.Dispatch<React.SetStateAction<Stitch[]>>;
  orientationParameters: OrientationParameters;
  setOrientationParameters: React.Dispatch<
    React.SetStateAction<OrientationParameters>
  >;
}

interface InputFieldProps {
  label: string;
  value: number;
  valueSetter: React.Dispatch<React.SetStateAction<number>>;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  valueSetter,
}) => (
  <div style={{ marginBottom: "15px" }}>
    <label>
      {label}
      <br />
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => valueSetter(Number(e.target.value))}
      />
    </label>
  </div>
);

interface CoordinatesInputProps {
  orientationParameters: OrientationParameters;
  setOrientationParameters: React.Dispatch<
    React.SetStateAction<OrientationParameters>
  >;
  disabled: boolean;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({
  orientationParameters,
  setOrientationParameters,
  disabled,
}) => {
  const { coordinates } = orientationParameters;
  const setLatitude = (latitude: number) =>
    setOrientationParameters({
      ...orientationParameters,
      coordinates: { ...coordinates, latitude },
    });
  const setLongitude = (rightAssention: number) =>
    setOrientationParameters({
      ...orientationParameters,
      coordinates: { ...coordinates, longitude: rightAssention * 15 - 180 },
    });
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "baseline",
        marginBottom: "20px",
      }}
    >
      <label
        style={{
          marginRight: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        Declension (degrees)
        <input
          type="number"
          value={coordinates.latitude}
          min="-90"
          max="90"
          step="0.1"
          onChange={(e) => setLatitude(Number(e.target.value))}
          style={{ marginTop: "5px" }}
          disabled={disabled}
        />
      </label>
      <label
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        Right assention (hours)
        <input
          type="number"
          value={(coordinates.longitude + 180) / 15}
          min="0"
          max="24"
          step="0.1"
          onChange={(e) => setLongitude(Number(e.target.value))}
          style={{ marginTop: "5px" }}
          disabled={disabled}
        />
      </label>
    </div>
  );
};

type LocationType =
  | "Derived"
  | "North Star"
  | "Southern Cross"
  | "Current Location"
  | "Custom Location";

const h1Style = {
  fontSize: "2.5rem",
  marginBottom: "10px",
};

const h2Style = {
  fontSize: "1.5rem",
  marginTop: "5px",
  marginBottom: "5px",
};

const h3Style = {
  fontSize: "1rem",
  marginTop: "5px",
  marginBottom: "5px",
};
interface ToggleAdvancedOptionsProps {
  showAdvancedOptions: boolean;
  setShowAdvancedOptions: React.Dispatch<React.SetStateAction<boolean>>;
}

const ToggleAdvancedOptions: React.FC<ToggleAdvancedOptionsProps> = ({
  showAdvancedOptions,
  setShowAdvancedOptions,
}) => (
  <h1
    style={{
      backgroundColor: "transparent",
      color: "white",
      padding: "10px 0",
      border: "none",
      cursor: "pointer",
      marginTop: "5px",
      marginBottom: "0px",
      display: "flex",
      alignItems: "center",
      fontSize: "1.25rem",
      borderBottom: showAdvancedOptions ? "1px solid white" : "none",
    }}
    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
  >
    {showAdvancedOptions ? "Hide Advanced Options" : "Show Advanced Options"}
    <span
      style={{
        marginLeft: "10px",
        transform: showAdvancedOptions ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.3s",
      }}
    >
      ▼
    </span>
  </h1>
);

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
      setOrientationParameters(prev => ({
        ...prev,
        coordinates: {
          latitude: dec,
          longitude: ((ra * 15 + 180) % 360) - 180,
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

  const handleDayChange = (value: number | null) => {
    if (value === null || (value >= 1 && value <= 31)) {
      setDay(value);
    }
  };

  const handleMonthChange = (value: number) => {
    if (value >= 1 && value <= 12) {
      setMonth(value);
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
  const [decreaseMethod, setDecreaseMethod] = useState<
    "Hemispherical" | "Pyramidal"
  >("Pyramidal");

  const handleDecreaseMethodChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedDecreaseMethod = e.target.value as
      | "Hemispherical"
      | "Pyramidal";
    setDecreaseMethod(selectedDecreaseMethod);
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

  const handleViewAndColour = () => {
    if (decreaseMethod === "Pyramidal" && stitchesPerRow % 10 !== 0) {
      alert(
        "The number of stitches per row to be divisible by 10. Change the decrease method to 'Hemispherial' under 'Advanced Options' or choose a different number of stitches per row."
      );
      return;
    }
    setStitches(getStitches(stitchesPerRow, numberOfRows, decreaseMethod));
    navigate("/render");
  };

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  return (
    <div style={{ textAlign: "left", padding: "20px" }}>
      <h1 style={h1Style}>Design</h1>
      <h2 style={h2Style}>Set Up Your Stitches</h2>
      <InputField
        label="Stitches per row"
        value={stitchesPerRow}
        valueSetter={setStitchesPerRow}
      />
      <InputField
        label="Number of rows before decreasing"
        value={numberOfRows}
        valueSetter={setNumberOfRows}
      />
      {locationType === "Derived" && (
        <>
          <h2 style={h2Style}>Customise Your Night Sky</h2>
          <h3 style={h3Style}>Choose a Date</h3>
          <div style={{ marginBottom: "10px" }}>
            <label>
              Day
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={day ?? ""}
                onChange={(e) =>
                  handleDayChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                style={{ marginLeft: "10px", marginRight: "20px" }}
              />
            </label>
            <label>
              Month
              <select
                value={month ?? ""}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                style={{ marginLeft: "10px" }}
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
          <h3 style={h3Style}>Choose a Time</h3>
          <div style={{ marginBottom: "10px" }}>
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
                style={{ marginLeft: "10px", marginRight: "20px" }}
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
                style={{ marginLeft: "10px" }}
              />
            </label>
          </div>
          <h3 style={h3Style}>Choose a Location</h3>
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
                style={{ marginLeft: "10px", marginRight: "20px" }}
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
            style={{
              cursor: "pointer",
              color: "lightblue",
              fontSize: "0.9rem",
            }}
          >
            Use current location
          </a>
        </>
      )}

      <div
        style={{
          overflow: "hidden",
          maxHeight: showAdvancedOptions ? "1000px" : "0",
          opacity: showAdvancedOptions ? 1 : 0,
          transition: "max-height 0.5s ease-in-out, opacity 0.5s ease-in-out",
        }}
      >
        <h2 style={h2Style}>Decrease Method</h2>
        <h3 style={h3Style}>Choose a Decrease Method</h3>
        <div style={{ marginBottom: "10px" }}>
          <select value={decreaseMethod} onChange={handleDecreaseMethodChange}>
            <option value="Hemispherical">Hemispherical</option>
            <option value="Pyramidal">Pyramidal</option>
          </select>
        </div>
        <h2 style={h2Style}>Orient Your Night Sky</h2>
        <h3 style={h3Style}>Choose a Location</h3>
        <div style={{ marginBottom: "10px" }}>
          <select value={locationType} onChange={handleLocationChange}>
            <option value="Derived">Derived From Place and Time</option>
            <option value="North Star">North Star (Polaris)</option>
            <option value="Southern Cross">Southern Cros (Crux)</option>
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
            <h3 style={h3Style}>Where Should This Point End Up?</h3>
            <div style={{ marginBottom: "10px" }}>
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
      <button
        style={{
          backgroundColor: "#3f51b5",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={handleViewAndColour}
      >
        Knit and Dye
      </button>
    </div>
  );
};

export default Design;
