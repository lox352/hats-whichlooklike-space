import React from "react";

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

export default ToggleAdvancedOptions;
