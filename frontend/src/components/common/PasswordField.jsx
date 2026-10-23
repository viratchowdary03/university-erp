import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import InputField from "./InputField";

const PasswordField = forwardRef(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <InputField
      ref={ref}
      type={visible ? "text" : "password"}
      rightElement={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="rounded-md p-1.5 text-slate-400 outline-none hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordField;
