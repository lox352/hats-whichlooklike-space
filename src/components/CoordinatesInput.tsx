import React from "react";
import { OrientationParameters } from "../types/OrientationParameters";

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

export default CoordinatesInput;
