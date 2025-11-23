import React from "react";

interface InputFieldProps {
    label: string;
    value: number;
    valueSetter: (value: number) => void;
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

export default InputField;
