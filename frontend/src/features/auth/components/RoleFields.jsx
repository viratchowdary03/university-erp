import { SCHOOLS, getSchool } from "../../../config/schools";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";

const TODAY = new Date().toISOString().slice(0, 10);
const INPUT_TYPE = { text: "text", number: "number", tel: "tel", date: "date" };

// Draws the questions for the chosen role (see config/roleFields.js)
export default function RoleFields({ fields, register, errors, schoolCode, setValue }) {
  const programs = getSchool(schoolCode)?.programs || [];

  return fields.map((field) => {
    const { name, label, kind } = field;
    const wrap = field.wide ? "sm:col-span-2" : "";
    const error = errors[name]?.message;
    const optionalLabel = field.required === false ? `${label} (optional)` : label;

    if (kind === "school") {
      return (
        <div key={name} className={wrap}>
          <Select
            label={label}
            error={error}
            {...register(name, { onChange: () => setValue("department", "") })}
          >
            <option value="">Select your school</option>
            {SCHOOLS.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </Select>
        </div>
      );
    }

    if (kind === "program") {
      return (
        <div key={name} className={wrap}>
          <Select label={label} error={error} disabled={!schoolCode} {...register(name)}>
            <option value="">{schoolCode ? "Select a program" : "Select a school first"}</option>
            {programs.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
      );
    }

    if (kind === "select") {
      return (
        <div key={name} className={wrap}>
          <Select label={label} error={error} {...register(name)}>
            <option value="">Select</option>
            {field.options.map((o) => {
              const option = typeof o === "string" ? { value: o, label: o } : o;
              return <option key={option.value} value={option.value}>{option.label}</option>;
            })}
          </Select>
        </div>
      );
    }

    return (
      <div key={name} className={wrap}>
        <InputField
          label={optionalLabel}
          type={INPUT_TYPE[kind] || "text"}
          placeholder={field.placeholder}
          min={kind === "number" ? field.min : undefined}
          max={kind === "number" ? field.max : kind === "date" ? TODAY : undefined}
          inputMode={kind === "number" ? "numeric" : undefined}
          error={error}
          {...register(name)}
        />
      </div>
    );
  });
}
